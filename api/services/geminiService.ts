
import { GoogleGenAI, Type } from "@google/genai";
import { AiSettings, Boleto } from "../../types";
import { translations } from "../../translations";
import * as pdfjs from 'pdfjs-dist';
import { createCanvas, Canvas } from 'canvas';
import Tesseract from 'tesseract.js';
import { Buffer } from 'buffer';
import { appConfig } from './configService';

// Setting the worker script for pdf.js in a Node.js environment.
// FIX: Removed explicit `require.resolve` to avoid TypeScript type errors.
// pdf.js will internally require this path in a Node.js environment.
pdfjs.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.js';

const renderPdfPageToCanvas = async (pdfBuffer: Buffer): Promise<Canvas> => {
    const data = new Uint8Array(pdfBuffer);
    const pdf = await pdfjs.getDocument(data).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    await page.render({ canvasContext: context, viewport: viewport } as any).promise;
    return canvas;
};

const preprocessCanvasForOcr = (canvas: Canvas): Canvas => {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const contrast = 64;
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;
        gray = factor * (gray - 128) + 128;
        gray = Math.max(0, Math.min(255, gray));
        const value = gray < 128 ? 0 : 255;
        data[i] = data[i + 1] = data[i + 2] = value;
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
};

const performOcr = async (canvas: Canvas): Promise<string> => {
    try {
        const preprocessedCanvas = preprocessCanvasForOcr(canvas);
        const { data: { text } } = await Tesseract.recognize(preprocessedCanvas.toBuffer('image/png'), 'por');
        return text;
    } catch (error) {
        console.error("Server-side OCR failed:", error);
        return ""; 
    }
};

export const extractBoletoInfo = async (
    pdfBuffer: Buffer, 
    fileName: string, 
    lang: 'pt' | 'en', 
    aiSettings: AiSettings
): Promise<Omit<Boleto, 'id' | 'status' | 'fileData' | 'comments' | 'companyId'>> => {
    if (!appConfig.API_KEY) {
        throw new Error("A chave da API do Gemini não está configurada no servidor.");
    }
    const ai = new GoogleGenAI({ apiKey: appConfig.API_KEY });
    
    const canvas = await renderPdfPageToCanvas(pdfBuffer);
    const ocrText = await performOcr(canvas);

    const imageAsBase64 = canvas.toDataURL('image/jpeg').split(',')[1];
    
    const imagePart = {
        inlineData: { mimeType: 'image/jpeg', data: imageAsBase64 },
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
        throw new Error("A resposta da API da IA está vazia ou é inválida.");
    }
    const parsedJson = JSON.parse(responseText);

    if (parsedJson.barcode) {
        parsedJson.barcode = parsedJson.barcode.replace(/[^\d]/g, '');
    }
    
    return {
        ...parsedJson,
        fileName: fileName,
    };
};
