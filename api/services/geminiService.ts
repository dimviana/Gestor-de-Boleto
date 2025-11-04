
import { GoogleGenAI, Type } from "@google/genai";
import { AiSettings, Boleto } from "../../types";
import { translations } from "../../translations";
import * as pdfjs from 'pdfjs-dist';
import { createCanvas, Canvas } from 'canvas';
import Tesseract from 'tesseract.js';
import { Buffer } from 'buffer';
import { appConfig } from './configService';

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
        throw new Error("geminiNoApiKeyServer");
    }

    try {
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
                        recipient: { type: Type.STRING, description: 'The full name of the beneficiary/payee (Beneficiário/Cedente). Capture the entire name, even if it is long or spans multiple lines.' },
                        drawee: { type: Type.STRING, description: 'The name of the drawee/payer (Sacado/Pagador). Should be null if not found.' },
                        documentDate: { type: Type.STRING, description: 'The document creation date (Data do Documento) in YYYY-MM-DD format. Should be null if not found.' },
                        dueDate: { type: Type.STRING, description: 'The main due date (Vencimento) in YYYY-MM-DD format.' },
                        amount: { type: Type.NUMBER, description: "The final payment amount. ALWAYS prioritize the field labeled '(=) Valor Cobrado'. If it's absent, use '(=) Valor do Documento'. It must not be zero if a document value is present." },
                        discount: { type: Type.NUMBER, description: 'The total discount amount, by summing fields like "(-) Desconto / Abatimento" or "(-) Outras Deduções". Should be null if not found or zero.' },
                        interestAndFines: { type: Type.NUMBER, description: 'The total amount of interest and fines, by summing fields like "(+) Juros / Multa" or "(+) Outros Acréscimos". Should be null if not found or zero.' },
                        barcode: { type: Type.STRING, description: 'The full digitable line (linha digitável), with all spaces, dots, and other non-numeric formatting removed. It must contain only numbers and be 47 or 48 digits long.' },
                        guideNumber: { type: Type.STRING, description: 'The document number. Give maximum priority to the field labeled "Nº Documento" or "Nº do Documento". If absent, look for "Nosso Número". Should be null if not found.' },
                        pixQrCodeText: { type: Type.STRING, description: 'The full text content of the PIX QR Code (Copia e Cola). Should be null if not found.' },
                    },
                    required: ["recipient", "dueDate", "amount", "barcode"],
                },
            },
        });
        
        const responseText = response.text;
        if (!responseText) {
            console.error("Gemini API returned an empty or invalid response object:", response);
            throw new Error("geminiEmptyResponse");
        }

        let parsedJson;
        try {
            parsedJson = JSON.parse(responseText);
        } catch (jsonError) {
            console.error("Failed to parse JSON from Gemini API:", responseText);
            throw new Error("geminiInvalidJson");
        }


        if (parsedJson.barcode) {
            parsedJson.barcode = parsedJson.barcode.replace(/[^\d]/g, '');
        }
        
        return {
            ...parsedJson,
            fileName: fileName,
        };

    } catch (error: any) {
        console.error("Error during Gemini AI processing:", error);

        const errorMessage = error.message || '';
        
        if (['geminiNoApiKeyServer', 'geminiEmptyResponse', 'geminiInvalidJson'].includes(errorMessage)) {
            throw error;
        }

        if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('API key not valid')) {
            throw new Error("geminiErrorApiKey");
        }
        if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
            throw new Error("geminiErrorRateLimit");
        }
        if (errorMessage.toLowerCase().includes('safety')) {
             throw new Error("geminiErrorSafety");
        }
        if (errorMessage.includes('400')) {
             throw new Error("geminiErrorBadRequest");
        }

        throw new Error("geminiGenericError");
    }
};
