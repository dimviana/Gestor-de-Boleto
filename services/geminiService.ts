import { GoogleGenAI, Type } from "@google/genai";
import { Boleto, BoletoStatus, AiSettings } from '../types';
import { translations } from '../translations';

declare const pdfjsLib: any;

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

        const imagePart = {
            inlineData: { mimeType: 'image/jpeg', data: canvas.toDataURL('image/jpeg').split(',')[1] },
        };

        const prompt = translations[lang].geminiPrompt;
        
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
                        recipient: { type: Type.STRING, description: 'The full name of the beneficiary/payee (Beneficiário/Cedente). It may contain multiple parts separated by slashes or hyphens (e.g., "Main Name / Secondary Name - Details"). Capture all text associated with this field, even if it spans multiple lines, until the next field (like CNPJ or Address) begins.' },
                        drawee: { type: Type.STRING, description: 'The name of the drawee/payer (Sacado/Pagador). Capture the full name, which is often found on a line below the label.' },
                        documentDate: { type: Type.STRING, description: 'The document creation date (Data do Documento) in YYYY-MM-DD format. Should be null if not found.' },
                        dueDate: { type: Type.STRING, description: 'The main due date (Vencimento) in YYYY-MM-DD format.' },
                        documentAmount: { type: Type.NUMBER, description: 'The original document value (Valor do Documento), distinct from the final payment amount.' },
                        discount: { type: Type.NUMBER, description: 'The value of any discount, usually labeled "(-) Desconto / Abatimento". Should be null if not found.' },
                        interestAndFines: { type: Type.NUMBER, description: 'The value of any interest or fines, usually labeled "(+) Juros / Multa" or "(+) Outros Acréscimos". Should be null if not found.' },
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
            console.error("Gemini API returned an empty or invalid response object:", response);
            // FIX: Correctly reference 'pdfProcessingError' which has been added to translations.
            throw new Error(translations[lang].pdfProcessingError);
        }

        const parsedJson = JSON.parse(responseText);
        
        if (parsedJson.barcode) {
            parsedJson.barcode = parsedJson.barcode.replace(/[^\d]/g, '');
        }

        const newBoleto: Omit<Boleto, 'companyId'> = {
            id: crypto.randomUUID(),
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
            status: BoletoStatus.TO_PAY,
            fileName: file.name,
            fileData: fileAsBase64,
            comments: null,
        };
        return newBoleto;
    } catch (error) {
        console.error("Error processing Boleto with Gemini:", error);
        // FIX: Correctly reference 'pdfProcessingError' which has been added to translations.
        throw new Error((error as Error).message || translations[lang].pdfProcessingError);
    }
};