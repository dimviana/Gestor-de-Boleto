
import { GoogleGenAI, Type } from "@google/genai";
import { Boleto, BoletoStatus, AiSettings } from '../../types';
import { appConfig } from './configService';
// Use the legacy build for Node.js compatibility
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import { createCanvas, Canvas } from 'canvas';
import { Buffer } from 'buffer';
import { translations } from '../../translations';


// Polyfill for browser's atob
const atob = (b64: string) => Buffer.from(b64, 'base64').toString('binary');


// Custom canvas factory to bridge pdfjs-dist with the 'canvas' library
class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    return {
      canvas: canvas as unknown as HTMLCanvasElement, // Type assertion
      context,
    };
  }

  reset(canvasAndContext: { canvas: HTMLCanvasElement; context: any }, width: number, height: number) {
    const canvas = canvasAndContext.canvas as unknown as Canvas;
    canvas.width = width;
    canvas.height = height;
  }

  destroy(canvasAndContext: { canvas: HTMLCanvasElement; context: any }) {
    const canvas = canvasAndContext.canvas as unknown as Canvas;
    canvas.width = 0;
    canvas.height = 0;
    (canvasAndContext as any).canvas = null;
    (canvasAndContext as any).context = null;
  }
}

const renderPdfPageToCanvas = async (pdfBuffer: Buffer): Promise<Canvas> => {
    const data = new Uint8Array(pdfBuffer);
    const pdf = await pdfjsLib.getDocument(data).promise;
    const page = await pdf.getPage(1); // Process only the first page
    const viewport = page.getViewport({ scale: 1.5 });
    
    const canvasFactory = new NodeCanvasFactory();
    const { canvas, context } = canvasFactory.create(viewport.width, viewport.height);

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvasFactory,
    };
    
    await page.render(renderContext).promise;
    return canvas as unknown as Canvas;
};

export const extractBoletoInfoWithGemini = async (
    pdfBuffer: Buffer,
    fileName: string
): Promise<Omit<Boleto, 'id' | 'status' | 'fileData' | 'comments' | 'companyId'>> => {
    try {
        const ai = new GoogleGenAI({ apiKey: appConfig.API_KEY });
        const aiSettings = typeof appConfig.ai_settings === 'string' 
            ? JSON.parse(appConfig.ai_settings)
            : appConfig.ai_settings;

        const canvas = await renderPdfPageToCanvas(pdfBuffer);
        const imageBase64 = canvas.toDataURL('image/jpeg').split(',')[1];

        const imagePart = {
            inlineData: { mimeType: 'image/jpeg', data: imageBase64 },
        };

        const prompt = translations['pt'].geminiPrompt; // Always use portuguese prompt for consistency
        
        const response = await ai.models.generateContent({
            model: aiSettings.model,
            contents: { parts: [{ text: prompt }, imagePart] },
            config: {
                temperature: aiSettings.temperature,
                topK: aiSettings.topK,
                topP: aiSettings.topP,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        recipient: { type: Type.STRING, description: 'The main name of the beneficiary/payee (Beneficiário/Cedente). Capture ONLY the primary company or person name. Exclude any CNPJ numbers, addresses, or additional legal descriptions that may follow the name.' },
                        drawee: { type: Type.STRING, description: 'The name of the drawee/payer (Sacado/Pagador). Capture the full name, which is often found on a line below the label.' },
                        documentDate: { type: Type.STRING, description: 'The document creation date (Data do Documento). It is often located in the top-left or central section of the document, sometimes with the value on a line below the label. Return in YYYY-MM-DD format. Should be null if not found.' },
                        dueDate: { type: Type.STRING, description: 'The main due date (Vencimento) in YYYY-MM-DD format. It is often located in the top-right section of the document, sometimes with the value directly below the label.' },
                        documentAmount: { type: Type.NUMBER, description: 'The original document value (Valor do Documento). If the label is not exact, find the value that is clearly marked as the base amount before any deductions or additions, often located in its own box in the upper-right section.' },
                        discount: { type: Type.NUMBER, description: 'The value of any discount. Look for labels like "(-) Desconto / Abatimento". If the label is missing, infer it from values marked with a minus sign (-) or positioned in a discount-related field.' },
                        interestAndFines: { type: Type.NUMBER, description: 'The value of any interest or fines. Look for labels like "(+) Juros / Multa" or "(+) Outros Acréscimos". If the label is missing, infer it from values marked with a plus sign (+) or positioned in a field for additions.' },
                        amount: { type: Type.NUMBER, description: "The final payment amount, which is a required field. First, search for '(=) Valor Cobrado'. If not found, you MUST use '(=) Valor do Documento'. Analyze the image to locate this value. It should not be null if a value is visible on the document." },
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
            throw new Error("Gemini API returned an empty or invalid response object.");
        }

        const parsedJson = JSON.parse(responseText);
        
        if (parsedJson.barcode) {
            parsedJson.barcode = parsedJson.barcode.replace(/[^\d]/g, '');
        }

        const newBoleto: Omit<Boleto, 'id' | 'companyId' | 'status' | 'fileData' | 'comments'> = {
            recipient: parsedJson.recipient || null,
            drawee: parsedJson.drawee || null,
            documentDate: parsedJson.documentDate || null,
            dueDate: parsedJson.dueDate || null,
            documentAmount: parsedJson.documentAmount || null,
            amount: parsedJson.amount || null,
            discount: parsedJson.discount || null,
            interestAndFines: parsedJson.interestAndFines || null,
            barcode: parsedJson.barcode || null,
            guideNumber: parsedJson.guideNumber || null,
            pixQrCodeText: parsedJson.pixQrCodeText || null,
            fileName: fileName,
            extractedData: parsedJson
        };
        return newBoleto;
    } catch (error) {
        console.error("Error processing Boleto with Gemini on backend:", error);
        throw new Error((error as Error).message || "pdfProcessingError");
    }
};