
import { GoogleGenAI, Type } from "@google/genai";
import { Boleto, BoletoStatus } from '../types';
import { translations } from '../translations';

declare const pdfjsLib: any;

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


const extractBoletoInfo = async (file: File, lang: 'pt' | 'en'): Promise<Omit<Boleto, 'id' | 'status' | 'fileData'>> => {
    if (!process.env.API_KEY) {
        throw new Error("API key is missing. Please set it in your environment variables.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const canvas = await renderPdfPageToCanvas(file);
    const fileAsBase64 = canvas.toDataURL('image/jpeg').split(',')[1];
    const mimeType = 'image/jpeg';

    const imagePart = {
        inlineData: {
            mimeType,
            data: fileAsBase64,
        },
    };

    const prompt = translations[lang].geminiPrompt;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { text: prompt },
                imagePart
            ],
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    recipient: { type: Type.STRING, description: 'The name of the beneficiary or company to be paid (Beneficiário/Cedente).' },
                    drawee: { type: Type.STRING, description: 'The name of the drawee (Sacado). Should be null if not found.' },
                    documentDate: { type: Type.STRING, description: 'The document creation date (Data do Documento) in YYYY-MM-DD format. Should be null if not found.' },
                    dueDate: { type: Type.STRING, description: 'The due date (Vencimento) in YYYY-MM-DD format.' },
                    amount: { type: Type.NUMBER, description: 'The payment amount (Valor do Documento) as a number.' },
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
        barcode: parsedJson.barcode,
        guideNumber: parsedJson.guideNumber,
        pixQrCodeText: parsedJson.pixQrCodeText,
        fileName: file.name,
    };
};


export const processBoletoPDF = async (file: File, lang: 'pt' | 'en'): Promise<Boleto> => {
    try {
        const [extractedData, fileData] = await Promise.all([
            extractBoletoInfo(file, lang),
            convertFileToBase64(file)
        ]);

        return {
            ...extractedData,
            id: crypto.randomUUID(),
            status: BoletoStatus.TO_PAY,
            fileData,
        };
    } catch (error) {
        console.error("Error processing Boleto with Gemini:", error);
        throw new Error("pdfProcessingError");
    }
};
