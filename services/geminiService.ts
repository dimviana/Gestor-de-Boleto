
import { GoogleGenAI, Type } from "@google/genai";
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
    // API key must be obtained exclusively from process.env.API_KEY for deployed environments.
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
    
    // Fallback for frontend-only mode where backend is not running.
    const key = localStorage.getItem('gemini_api_key');
    if(key) return key;
    
    throw new Error("Chave da API não encontrada. A API Key deve ser configurada na variável de ambiente API_KEY ou no localStorage para modo de demonstração.");
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
    if (!ctx) {
        throw new Error("Could not get canvas context for preprocessing");
    }
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Grayscale and thresholding
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const value = gray < 128 ? 0 : 255;
        data[i] = data[i + 1] = data[i + 2] = value;
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
};


const performOcr = async (canvas: HTMLCanvasElement): Promise<string> => {
    try {
        const preprocessedCanvas = preprocessCanvasForOcr(canvas);
        const { data: { text } } = await Tesseract.recognize(preprocessedCanvas, 'por');
        return text;
    } catch (error) {
        console.error("Client-side OCR failed:", error);
        return ""; // Return empty string on failure
    }
};

export const processBoletoPDF = async (
    file: File,
    lang: 'pt' | 'en',
    aiSettings: AiSettings
): Promise<Omit<Boleto, 'companyId'>> => {
    try {
        const apiKey = getApiKey();
        const ai = new GoogleGenAI({ apiKey });

        const [canvas, fileAsBase64] = await Promise.all([
            renderPdfPageToCanvas(file),
            convertFileToBase64(file),
        ]);

        const ocrText = await performOcr(canvas);

        const imagePart = {
            inlineData: { mimeType: 'image/jpeg', data: canvas.toDataURL('image/jpeg').split(',')[1] },
        };

        const prompt = translations[lang].geminiPrompt;
        const fullPromptWithOcr = `${prompt}\n\n--- TEXTO EXTRAÍDO VIA OCR ---\n${ocrText}\n--- FIM DO TEXTO EXTRAÍDO ---`;
        
        const response = await ai.models.generateContent({
            model: aiSettings.model,
            contents: { parts: [{ text: fullPromptWithOcr }, imagePart] },
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
        
        const responseText = response.text;
        if (!responseText) {
            console.error("Gemini API returned an empty or invalid response object:", response);
            throw new Error(translations[lang].pdfProcessingError);
        }

        const parsedJson = JSON.parse(responseText);
        
        if (parsedJson.barcode) {
            parsedJson.barcode = parsedJson.barcode.replace(/[^\d]/g, '');
        }

        const newBoleto: Omit<Boleto, 'companyId'> = {
            id: crypto.randomUUID(),
            ...parsedJson,
            status: BoletoStatus.TO_PAY,
            fileName: file.name,
            fileData: fileAsBase64,
            comments: null,
        };
        return newBoleto;
    } catch (error) {
        console.error("Error processing Boleto with Gemini:", error);
        throw new Error((error as Error).message || translations[lang].pdfProcessingError);
    }
};