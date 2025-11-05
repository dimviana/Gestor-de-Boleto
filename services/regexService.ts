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
 * Improved PDF text extraction with better line grouping
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

        // Improved line grouping with tolerance for small vertical differences
        const lines: { [key: string]: any[] } = {};
        for(const item of textContent.items) {
            const y = Math.round(item.transform[5] / 2) * 2; // Group with 2px tolerance
            const key = y.toString();
            if (!lines[key]) lines[key] = [];
            lines[key].push(item);
        }

        // Sort lines by their y-coordinate (top to bottom)
        const sortedLines = Object.keys(lines)
            .sort((a, b) => Number(b) - Number(a))
            .map(y => lines[y]);

        // For each line, sort items by x-coordinate and join them
        const pageText = sortedLines.map(lineItems => {
            return lineItems
                .sort((a, b) => a.transform[4] - b.transform[4])
                .map(item => item.str)
                .join(' ');
        }).join('\n');

        fullText += pageText + '\n\n';
    }
    return fullText;
};

/**
 * Enhanced OCR cleaning for common misinterpretations
 */
const cleanOcrMistakes = (value: string): string => {
    if (!value) return '';
    return value
        .replace(/O|º/g, '0')
        .replace(/I|l/g, '1')
        .replace(/S/g, '5')
        .replace(/B/g, '8')
        .replace(/Z/g, '2')
        .replace(/G/g, '6')
        .replace(/§/g, '5');
};

/**
 * Improved barcode detection for various formats
 */
const extractBarcode = (text: string): string | null => {
    // Pattern 1: Standard barcode format with dots
    const pattern1 = /\b(\d{5}\.?\d{5}\s+\d{5}\.?\d{6}\s+\d{5}\.?\d{6}\s+\d\s+\d{14})\b/;
    
    // Pattern 2: Clean 47-48 digit barcode
    const pattern2 = /\b(\d{47,48})\b/;
    
    // Pattern 3: Barcode split across lines
    const pattern3 = /(\d{5}\.?\d{5})[\s\n]+(\d{5}\.?\d{6})[\s\n]+(\d{5}\.?\d{6})[\s\n]+(\d)[\s\n]+(\d{14})/;
    
    let match = text.match(pattern1);
    if (match) {
        return cleanOcrMistakes(match[1]).replace(/[^\d]/g, '');
    }
    
    match = text.match(pattern2);
    if (match) {
        return cleanOcrMistakes(match[1]);
    }
    
    match = text.match(pattern3);
    if (match) {
        return match.slice(1).join('').replace(/[^\d]/g, '');
    }
    
    return null;
};

/**
 * Enhanced currency parsing for Brazilian format
 */
const parseCurrency = (value: string | null): number | null => {
    if (!value) return null;
    
    let valueStr = cleanOcrMistakes(value.trim());
    
    // Remove currency symbols and extra text
    valueStr = valueStr.replace(/R\$/gi, '')
                      .replace(/RS/gi, '')
                      .replace(/valor/gi, '')
                      .trim();
    
    if (!/\d/.test(valueStr)) return null;

    const hasComma = valueStr.includes(',');
    const hasDot = valueStr.includes('.');

    if (hasComma && hasDot) {
        // Format: 1.234,56 - remove dots, replace comma with dot
        valueStr = valueStr.replace(/\./g, '').replace(',', '.');
    } else if (hasComma && !hasDot) {
        // Format: 1234,56 or 68,14
        const parts = valueStr.split(',');
        if (parts[1] && parts[1].length === 2) {
            // Has two decimal places
            valueStr = parts[0].replace(/\./g, '') + '.' + parts[1];
        } else {
            // No decimal or malformed
            valueStr = valueStr.replace(',', '.');
        }
    } else if (!hasComma && hasDot) {
        const lastDotIndex = valueStr.lastIndexOf('.');
        const isDecimal = valueStr.length - lastDotIndex - 1 === 2;
        const hasMultipleDots = (valueStr.match(/\./g) || []).length > 1;

        if (hasMultipleDots || !isDecimal) {
            valueStr = valueStr.replace(/\./g, '');
        }
    }
    
    const num = parseFloat(valueStr.replace(/[^\d.]/g, ''));
    return isNaN(num) ? null : Math.round(num * 100) / 100; // Round to 2 decimal places
};

/**
 * Improved date parsing
 */
const parseDate = (value: string | null): string | null => {
    if (!value) return null;
    
    const cleanValue = cleanOcrMistakes(value);
    const match = cleanValue.match(/(\d{2})[\/Il]?(\d{2})[\/Il]?(\d{4})/);
    
    if (!match) return null;
    
    const [, day, month, year] = match;
    
    // Basic validation
    if (parseInt(day, 10) === 0 || parseInt(month, 10) === 0 || parseInt(month, 10) > 12) {
        return null;
    }
    
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

/**
 * Enhanced boleto information extraction
 */
const extractBoletoInfoWithRegex = async (file: File): Promise<Omit<Boleto, 'id' | 'status' | 'fileData' | 'comments' | 'companyId'>> => {
    const text = await getPdfTextContent(file);

    // Normalize text but preserve structure
    const normalizedText = text.replace(/ +/g, ' ').trim();
    
    // Enhanced patterns based on the specific PDF structure
    const patterns = {
        // Amount patterns: More robust to handle variations in spacing and layout
        amountValorDocumento: /(?:\(=\))?\s*Valor do Documento[^\d\r\n]*?([\d.,]{3,})/i,
        amountValorCobrado: /(?:\(=\))?\s*Valor Cobrado[^\d\r\n]*?([\d.,]{3,})/i,
        
        // Date patterns
        documentDate: /(?:Data do Documento)[\s:\n]*(\d{2}[\/Il]\d{2}[\/Il]\d{4})/i,
        dueDate: /(?:Vencimento)[\s:\n]*(\d{2}[\/Il]\d{2}[\/Il]\d{4})/i,
        
        // Entity patterns
        recipient: /(?:Cedente|Beneficiário)[\s:\n]*([^\n\r]*?(?:\n[^\n\r]*?)?)(?=\s*(?:Data|Nº|Sacado|Instruções|Agência))/is,
        drawee: /(?:Sacado|Pagador)[\s:\n]*([^\n\r]*?(?:\n[^\n\r]*?)?)(?=\s*(?:Instruções|Descrição|Autorização|Autenticação Mecânica))/is,
        
        // Document number patterns
        guideNumberDoc: /(?:N[ºo\.]?\s?(?:do\s)?Documento(?:[\/]?Guia)?)[\s.:\n]*?(\S+)/i,
        guideNumberNosso: /(?:Nosso Número)[\s:\n]*(\S+)/i,
        
        // PIX QR Code
        pixQrCodeText: /(000201\S{100,})/i,
    };
    
    // Extract barcode
    const barcode = extractBarcode(normalizedText);
    
    // --- Refactored Amount Extraction ---
    // Extract Document Amount (Valor do Documento)
    const documentAmountMatch = normalizedText.match(patterns.amountValorDocumento);
    const documentAmount = parseCurrency(documentAmountMatch ? documentAmountMatch[1] : null);

    // Extract Amount Charged (Valor Cobrado)
    const valorCobradoMatch = normalizedText.match(patterns.amountValorCobrado);
    let amount = parseCurrency(valorCobradoMatch ? valorCobradoMatch[1] : null);

    // Fallback logic: if Valor Cobrado is not found or is zero, use Valor do Documento as the final amount.
    if (amount === null || amount === 0) {
        amount = documentAmount;
    }
    
    // Extract dates
    const documentDateMatch = normalizedText.match(patterns.documentDate);
    const documentDate = parseDate(documentDateMatch ? documentDateMatch[1] : null);
    
    const dueDateMatch = normalizedText.match(patterns.dueDate);
    const dueDate = parseDate(dueDateMatch ? dueDateMatch[1] : null);
    
    // Extract entities with improved cleaning
    const extractEntity = (match: RegExpMatchArray | null): string | null => {
        if (!match || !match[1]) return null;
        
        return match[1]
            .trim()
            .replace(/\s*\n\s*/g, ' / ')
            .replace(/\s{2,}/g, ' ')
            .replace(/[-_]+/g, ' ')
            .trim();
    };
    
    const recipientMatch = normalizedText.match(patterns.recipient);
    const recipient = extractEntity(recipientMatch);
    
    const draweeMatch = normalizedText.match(patterns.drawee);
    const drawee = extractEntity(draweeMatch);
    
    // Extract guide number with multiple attempts, now with corrected regex
    let guideNumberMatch = normalizedText.match(patterns.guideNumberDoc);
    if (!guideNumberMatch) {
        guideNumberMatch = normalizedText.match(patterns.guideNumberNosso);
    }
    
    const guideNumber = guideNumberMatch ? guideNumberMatch[1].trim() : null;
    
    // Extract PIX QR Code
    const pixQrCodeTextMatch = normalizedText.match(patterns.pixQrCodeText);
    const pixQrCodeText = pixQrCodeTextMatch ? pixQrCodeTextMatch[0].trim() : null;

    return {
        recipient,
        drawee,
        documentDate,
        dueDate,
        documentAmount,
        amount,
        discount: null,
        interestAndFines: null,
        barcode,
        guideNumber,
        pixQrCodeText,
        fileName: file.name,
    };
};

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
        throw new Error("pdfProcessingError");
    }
};
