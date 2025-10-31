import { Boleto, BoletoStatus } from '../types';

declare const pdfjsLib: any;

const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });
};

/**
 * Extracts text from a PDF file while preserving its visual layout.
 * It groups text items by their vertical position to form lines,
 * then sorts those lines to reconstruct the document structure,
 * mimicking an OCR-like text capture.
 * @param file The PDF file to process.
 * @returns A promise that resolves to the structured text content.
 */
const getPdfTextContent = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    let fullText = '';

    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        if (textContent.items.length === 0) continue;

        // Group text items into lines based on their vertical position (y-coordinate)
        const lines: { [key: number]: any[] } = {};
        for(const item of textContent.items) {
            const y = Math.round(item.transform[5]);
            if (!lines[y]) lines[y] = [];
            lines[y].push(item);
        }

        // Sort lines by their y-coordinate (top to bottom)
        const sortedLines = Object.keys(lines)
            .sort((a, b) => Number(b) - Number(a)) // Corrected to sort top-to-bottom
            .map(y => lines[parseInt(y, 10)]);

        // For each line, sort items by x-coordinate (left to right) and join them
        const pageText = sortedLines.map(lineItems => {
            return lineItems
                .sort((a, b) => a.transform[4] - b.transform[4])
                .map(item => item.str)
                .join(' ');
        }).join('\n');

        fullText += pageText + '\n\n'; // Add space between pages
    }
    return fullText;
};


const extractBoletoInfoWithRegex = async (file: File): Promise<Omit<Boleto, 'id' | 'status' | 'fileData'>> => {
    const text = await getPdfTextContent(file);

    // Normalize text: remove multiple spaces, but keep newlines for structure
    const normalizedText = text.replace(/ +/g, ' ').trim();

    // Refactored regex patterns for increased robustness and flexibility
    const patterns = {
        // Handles formatted line (with optional dots and flexible spaces) OR a raw 47-48 digit number.
        barcode: /\b(\d{5}\.?\d{5}\s+\d{5}\.?\d{6}\s+\d{5}\.?\d{6}\s+\d\s+\d{14})\b|(\b\d{47,48}\b)/,
        // Allows amount to be on the next line from its label. Handles different currency notations.
        amount: /(?:Valor (?:do )?Documento|Valor Cobrado)[\s.:\n]*?R?\$?\s*([\d.,]+)/i,
        // Allows due date to be on the next line from its label.
        dueDate: /(?:Vencimento)[\s.:\n]*?(\d{2}\/\d{2}\/\d{4})/i,
        // Allows document date to be on the next line from its label.
        documentDate: /(?:Data (?:do )?Documento)[\s.:\n]*?(\d{2}\/\d{2}\/\d{4})/i,
        // Flexible labels for document number, allowing more character types.
        guideNumber: /(?:N[ºo\.]?\s?(?:do\s)?Documento|Nosso\sN[úu]mero)[\s.:\n]*?([\w\d\/-]+)/i,
        recipient: /(?:Beneficiário|Cedente)[\s.:]*([^\n]+)/i,
        drawee: /(?:Pagador|Sacado)[\s.:]*([^\n]+)/i,
        // Captures any long non-whitespace string starting with the PIX identifier.
        pixQrCodeText: /(000201\S{100,})/i,
    };

    const barcodeMatch = normalizedText.match(patterns.barcode);
    const amountMatch = normalizedText.match(patterns.amount);
    const dueDateMatch = normalizedText.match(patterns.dueDate);
    const documentDateMatch = normalizedText.match(patterns.documentDate);
    const guideNumberMatch = normalizedText.match(patterns.guideNumber);
    const recipientMatch = normalizedText.match(patterns.recipient);
    const draweeMatch = normalizedText.match(patterns.drawee);
    const pixQrCodeTextMatch = normalizedText.match(patterns.pixQrCodeText);
    
    // Process matches
    const rawBarcode = barcodeMatch ? (barcodeMatch[1] || barcodeMatch[2]) : null;
    const barcode = rawBarcode ? rawBarcode.replace(/[^\d]/g, '') : null;
    
    const amountStr = amountMatch ? amountMatch[1].replace(/\./g, '').replace(',', '.') : null;
    const amount = amountStr ? parseFloat(amountStr) : null;
    
    const parseDate = (match: RegExpMatchArray | null): string | null => {
        if (!match || !match[1]) return null;
        const [day, month, year] = match[1].split('/');
        // Basic validation to avoid invalid dates like 00/00/0000
        if (parseInt(day, 10) === 0 || parseInt(month, 10) === 0 || !year || year.length < 4) return null;
        return `${year}-${month}-${day}`;
    };

    const dueDate = parseDate(dueDateMatch);
    const documentDate = parseDate(documentDateMatch);
    
    const cleanField = (match: RegExpMatchArray | null, stopWordsRegex: RegExp): string | null => {
        if (!match) return null;
        let value = match[1].trim();
        // Remove text from adjacent fields that might have been captured on the same line
        value = value.split(stopWordsRegex)[0].trim().replace(/--/g, '').trim();
        return value || null; // Return null if the result is an empty string
    };

    const recipient = cleanField(recipientMatch, /CNPJ|CPF|Agência|Nosso Número|Guia/i);
    const drawee = cleanField(draweeMatch, /CNPJ|CPF|Data do Documento|Nº do Documento|Vencimento|Guia|CEP|Endereço/i);

    return {
        recipient,
        drawee,
        documentDate,
        dueDate,
        amount,
        barcode,
        guideNumber: guideNumberMatch ? guideNumberMatch[1].trim() : null,
        pixQrCodeText: pixQrCodeTextMatch ? pixQrCodeTextMatch[0].trim() : null,
        fileName: file.name,
    };
};

export const processBoletoPDFWithRegex = async (file: File): Promise<Boleto> => {
    try {
        const [extractedData, fileData] = await Promise.all([
            extractBoletoInfoWithRegex(file),
            convertFileToBase64(file)
        ]);

        return {
            ...extractedData,
            id: crypto.randomUUID(),
            status: BoletoStatus.TO_PAY,
            fileData,
        };
    } catch (error) {
        console.error("Error processing Boleto with REGEX:", error);
        throw new Error("pdfProcessingError"); // Use a consistent error key
    }
};
