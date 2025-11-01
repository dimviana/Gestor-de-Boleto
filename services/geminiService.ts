

import { GoogleGenAI, Type } from "@google/genai";
// FIX: Import BoletoStatus to resolve reference error.
import { Boleto, BoletoStatus, AiSettings } from '../types';
import { translations } from '../translations';

declare const pdfjsLib: any;
declare const Tesseract: any;

/**
 * Helper function to get the API key.
 * This makes the application runnable locally by using localStorage as the primary source,
 * as suggested by the app's own documentation component.
 * It retains compatibility with the original environment by checking for `process.env.API_KEY` as a fallback.
 */
const getApiKey = (): string => {
    // FIX: API key must be obtained exclusively from process.env.API_KEY.
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
    
    // Provide a helpful error message for local setup.
    throw new Error("Chave da API não encontrada. A API Key deve ser configurada na variável de ambiente API_KEY.");
};


const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });
};

const renderPdfPageToCanvas = async (file: File): Promise<HTMLCanvasElement> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (!context) {
        throw new Error("Could not get canvas context");
    }

    await page.render({ canvasContext: context, viewport: viewport }).promise;
    return canvas;
};

/**
 * Pre-processes a canvas image to improve OCR accuracy.
 * Applies grayscale and binarization (thresholding) filters.
 * @param canvas The canvas to process.
 * @returns The processed canvas.
 */
const preprocessCanvasForOcr = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        // Grayscale using luminosity method
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Binarization (simple thresholding)
        const threshold = 128;
        const color = gray < threshold ? 0 : 255;
        
        data[i] = color;     // Red
        data[i + 1] = color; // Green
        data[i + 2] = color; // Blue
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
};


/**
 * Performs OCR on a canvas element using Tesseract.js.
 * @param canvas The canvas containing the image to process.
 * @returns A promise that resolves to the extracted text.
 */
const performOcr = async (canvas: HTMLCanvasElement): Promise<string> => {
    try {
        const preprocessedCanvas = preprocessCanvasForOcr(canvas);
        const worker = await Tesseract.createWorker('por'); // 'por' for Portuguese
        
        // Set Page Segmentation Mode for better layout analysis
        await worker.setParameters({
            tessedit_pageseg_mode: Tesseract.PSM.AUTO_OSD, // Let Tesseract detect orientation and layout
        });

        const { data: { text } } = await worker.recognize(preprocessedCanvas);
        await worker.terminate();
        return text;
    } catch (error) {
        console.error("OCR failed:", error);
        // Return empty string so the process can continue with the image only
        return ""; 
    }
};

// FIX: Update return type to exclude companyId as it's not available at this stage.
const extractBoletoInfo = async (file: File, lang: 'pt' | 'en', aiSettings: AiSettings): Promise<Omit<Bleto, 'id' | 'status' | 'fileData' | 'comments' | 'companyId'>> => {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    
    const canvas = await renderPdfPageToCanvas(file);
    
    // New OCR step
    const ocrText = await performOcr(canvas);

    const fileAsBase64 = canvas.toDataURL('image/jpeg').split(',')[1];
    const mimeType = 'image/jpeg';

    const imagePart = {
        inlineData: {
            mimeType,
            data: fileAsBase64,
        },
    };

    const prompt = translations[lang].geminiPrompt;
    
    // Combine the main prompt with the extracted OCR text
    const fullPromptWithOcr = `${prompt}\n\n--- TEXTO EXTRAÍDO VIA OCR ---\n${ocrText}\n--- FIM DO TEXTO EXTRAÍDO ---`;

    const response = await ai.models.generateContent({
        model: aiSettings.model,
        contents: {
            parts: [
                { text: fullPromptWithOcr },
                imagePart
            ],
        },
        config: {
            temperature: aiSettings.temperature,
            topK: aiSettings.topK,
            topP: aiSettings.topP,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    recipient: { type: Type.STRING, description: 'The name of the beneficiary or company to be paid (Beneficiário/Cedente).' },
                    drawee: { type: Type.STRING, description: 'The name of the drawee (Sacado). Should be null if not found.' },
                    documentDate: { type: Type.STRING, description: 'The document creation date (Data do Documento) in YYYY-MM-DD format. Should be null if not found.' },
                    dueDate: { type: Type.STRING, description: 'The due date (Vencimento) in YYYY-MM-DD format.' },
                    amount: { type: Type.NUMBER, description: 'The final payment amount (Valor Cobrado or Valor do Documento) as a number.' },
                    discount: { type: Type.NUMBER, description: 'The discount amount (Desconto / Abatimento). Should be null if not found.' },
                    interestAndFines: { type: Type.NUMBER, description: 'The interest and fines amount (Juros / Multa). Should be null if not found.' },
                    barcode: { type: Type.STRING, description: 'The full digitable line (linha digitável).' },
                    guideNumber: { type: Type.STRING, description: 'The document number (número do documento) of the boleto. Should be null if not found.' },
                    pixQrCodeText: { type: Type.STRING, description: 'The full text content of the PIX QR Code (Copia e Cola). Should be null if not found.' },
                },
                required: ["recipient", "dueDate", "amount", "barcode"],
            },
        },
    });

    const parsedJson = JSON.parse(response.text);

    // Normalize barcode by removing all non-digit characters for consistent duplicate checks
    if (parsedJson.barcode) {
        parsedJson.barcode = parsedJson.barcode.replace(/[^\d]/g, '');
    }
    
    return {
        recipient: parsedJson.recipient,
        drawee: parsedJson.drawee,
        documentDate: parsedJson.documentDate,
        dueDate: parsedJson.dueDate,
        amount: parsedJson.amount,
        discount: parsedJson.discount,
        interestAndFines: parsedJson.interestAndFines,
        barcode: parsedJson.barcode,
        guideNumber: parsedJson.guideNumber,
        pixQrCodeText: parsedJson.pixQrCodeText,
        fileName: file.name,
    };
};


// FIX: Update return type to reflect that companyId is not part of the returned object yet.
export const processBoletoPDF = async (file: File, lang: 'pt' | 'en', aiSettings: AiSettings): Promise<Omit<Boleto, 'companyId'>> => {
    try {
        const [extractedData, fileData] = await Promise.all([
            extractBoletoInfo(file, lang, aiSettings),
            convertFileToBase64(file)
        ]);

        return {
            ...extractedData,
            id: crypto.randomUUID(),
            status: BoletoStatus.TO_PAY,
            fileData,
            comments: null,
        };
    } catch (error) {
        console.error("Error processing Boleto with Gemini:", error);
        // Pass the specific error message to the caller (e.g., if API key is missing)
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("pdfProcessingError");
    }
};