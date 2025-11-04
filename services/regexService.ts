

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

/**
 * Replaces common OCR character misinterpretations with the correct characters.
 * @param value The string to clean.
 * @returns The cleaned string.
 */
const cleanOcrMistakes = (value: string): string => {
    if (!value) return '';
    return value
        .replace(/O/g, '0')
        .replace(/I/g, '1')
        .replace(/l/g, '1')
        .replace(/S/g, '5')
        .replace(/B/g, '8')
        .replace(/Z/g, '2');
};


// FIX: Update return type to exclude companyId as it's not available at this stage.
const extractBoletoInfoWithRegex = async (file: File): Promise<Omit<Boleto, 'id' | 'status' | 'fileData' | 'comments' | 'companyId'>> => {
    const text = await getPdfTextContent(file);

    // Normalize text: remove multiple spaces, but keep newlines for structure
    const normalizedText = text.replace(/ +/g, ' ').trim();

    // Upgraded REGEX patterns for improved data extraction.
    const patterns = {
        barcode: /\b(\d{5}\.?\d{5}\s+\d{5}\.?\d{6}\s+\d{5}\.?\d{6}\s+\d\s+\d{14})\b|(\b\d{47,48}\b)/,
        amountValorCobrado: /(?:Valor Cobrado)[\s.:\n]*?R?\$?\s*([\d.,]+)/i,
        amountValorDocumento: /(?:(?:\(=\)\s*)?Valor (?:do )?Documento)[\s.:\n]*?R?\$?\s*([\d.,]+)/i,
        amountGeneric: /(?:Valor Total|Valor a Pagar|Valor L[íi]quido)[\s.:\n]*?R?\$?\s*([\d.,]+)/i, // Fallback
        dueDate: /(?:Vencimento)[\s.:\n]*?(\d{2}[\/Il]\d{2}[\/Il]\d{4})/i,
        documentDate: /(?:Data (?:do )?Documento)[\s.:\n]*?(\d{2}[\/Il]\d{2}[\/Il]\d{4})/i,
        guideNumber: /(?:N[ºo\.]?\s?(?:do\s)?Documento|Nosso\sN[úu]mero|Guia)[\s.:\n]*?([^\s\n][^\n]*?)(?=\s{2,}|[\r\n]|$)/i,
        recipient: /(?:Beneficiário|Cedente)[\s.:\n]*?([^\s\n][^\n]*?)(?=\s{2,}|[\r\n]|$)/i,
        drawee: /(?:Pagador|Sacado)[\s.:\n]*?([^\s\n][^\n]*?)(?=\s{2,}|[\r\n]|$)/i,
        pixQrCodeText: /(000201\S{100,})/i,
    };
    
    // Process matches
    const barcodeMatch = normalizedText.match(patterns.barcode);
    
    // Prioritize "Valor Cobrado" over "Valor do Documento", with a generic fallback
    let amountMatch = normalizedText.match(patterns.amountValorCobrado);
    if (!amountMatch) {
        amountMatch = normalizedText.match(patterns.amountValorDocumento);
    }
    if (!amountMatch) {
        amountMatch = normalizedText.match(patterns.amountGeneric);
    }
    
    const dueDateMatch = normalizedText.match(patterns.dueDate);
    const documentDateMatch = normalizedText.match(patterns.documentDate);
    const guideNumberMatch = normalizedText.match(patterns.guideNumber);
    const recipientMatch = normalizedText.match(patterns.recipient);
    const draweeMatch = normalizedText.match(patterns.drawee);
    const pixQrCodeTextMatch = normalizedText.match(patterns.pixQrCodeText);
    
    const rawBarcode = barcodeMatch ? (barcodeMatch[1] || barcodeMatch[2]) : null;
    const barcode = rawBarcode ? cleanOcrMistakes(rawBarcode).replace(/[^\d]/g, '') : null;
    
    const parseCurrency = (match: RegExpMatchArray | null): number | null => {
        if (!match || !match[1]) return null;
        let valueStr = match[1];
        valueStr = cleanOcrMistakes(valueStr);
        valueStr = valueStr.replace(/\./g, '').replace(',', '.');
        if (isNaN(parseFloat(valueStr))) return null;
        return parseFloat(valueStr);
    };

    const amount = parseCurrency(amountMatch);
    
    const parseDate = (match: RegExpMatchArray | null): string | null => {
        if (!match || !match[1]) return null;
        const [day, month, year] = match[1].split(/[\/Il]/);
        // Basic validation to avoid invalid dates like 00/00/0000
        if (!day || !month || !year || parseInt(day, 10) === 0 || parseInt(month, 10) === 0 || year.length < 4) return null;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    };

    const dueDate = parseDate(dueDateMatch);
    const documentDate = parseDate(documentDateMatch);

    const getMatchValue = (match: RegExpMatchArray | null): string | null => {
        if (!match || !match[1]) return null;
        const value = match[1].trim().replace(/--/g, '').trim();
        return value || null;
    };

    const recipient = getMatchValue(recipientMatch);
    const drawee = getMatchValue(draweeMatch);
    const guideNumber = getMatchValue(guideNumberMatch);

    return {
        recipient,
        drawee,
        documentDate,
        dueDate,
        amount,
        discount: null,
        interestAndFines: null,
        barcode,
        guideNumber,
        pixQrCodeText: pixQrCodeTextMatch ? pixQrCodeTextMatch[0].trim() : null,
        fileName: file.name,
    };
};

// FIX: Update return type to reflect that companyId is not part of the returned object yet.
export const processBoletoPDFWithRegex = async (file: File): Promise<Omit<Boleto, 'companyId'>> => {
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
            comments: null,
        };
    } catch (error) {
        console.error("Error processing Boleto with REGEX:", error);
        throw new Error("pdfProcessingError"); // Use a consistent error key
    }
};
