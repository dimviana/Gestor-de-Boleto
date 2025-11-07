import { Boleto } from '../../types';
import pdfParse from 'pdf-parse';
import { Buffer } from 'buffer';

const getPdfTextContent = async (pdfBuffer: Buffer): Promise<string> => {
    try {
        // The type definitions for 'pdf-parse' can cause a type error in some TS configurations.
        // Casting to 'any' bypasses this potential issue.
        const data = await (pdfParse as any)(pdfBuffer);
        return data.text;
    } catch (error) {
        console.error("Error parsing PDF with pdf-parse:", error);
        throw new Error("Could not read text content from PDF file.");
    }
};

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

const extractBarcode = (text: string): string | null => {
    // Pattern for standard boleto barcode format with spaces and dots
    const pattern1 = /\b(\d{5}\.?\d{5}\s+\d{5}\.?\d{6}\s+\d{5}\.?\d{6}\s+\d\s+\d{14})\b/;
    // Pattern for a raw string of 47 or 48 digits
    const pattern2 = /\b(\d{47,48})\b/;
    // Pattern for barcode split across multiple lines
    const pattern3 = /(\d{5}\.?\d{5})[\s\n]+(\d{5}\.?\d{6})[\s\n]+(\d{5}\.?\d{6})[\s\n]+(\d)[\s\n]+(\d{14})/;
    
    let match = text.match(pattern1);
    if (match) return cleanOcrMistakes(match[1]).replace(/[^\d]/g, '');
    
    match = text.match(pattern2);
    if (match) return cleanOcrMistakes(match[1]);
    
    match = text.match(pattern3);
    if (match) return match.slice(1).join('').replace(/[^\d]/g, '');
    
    return null;
};

const parseCurrency = (value: string | null): number | null => {
    if (!value) return null;
    let valueStr = cleanOcrMistakes(value.trim()).replace(/R\$/gi, '').replace(/RS/gi, '').replace(/valor/gi, '').trim();
    if (!/\d/.test(valueStr)) return null;

    const hasComma = valueStr.includes(',');
    const hasDot = valueStr.includes('.');

    // Standard Brazilian format: 1.234,56
    if (hasComma && hasDot) {
        valueStr = valueStr.replace(/\./g, '').replace(',', '.');
    } 
    // Format without dots: 1234,56
    else if (hasComma && !hasDot) {
        const parts = valueStr.split(',');
        // Ensure the comma is for decimals
        if (parts[1] && parts[1].length === 2) {
            valueStr = parts[0].replace(/\./g, '') + '.' + parts[1];
        } else {
             valueStr = valueStr.replace(',', '.');
        }
    }
    // Format with only dots: 1234.56 or 1.234
    else if (!hasComma && hasDot) {
        const lastDotIndex = valueStr.lastIndexOf('.');
        const isDecimal = valueStr.length - lastDotIndex - 1 === 2;
        const hasMultipleDots = (valueStr.match(/\./g) || []).length > 1;
        // If it has multiple dots (1.234.567) or isn't a decimal (1.234), remove dots
        if (hasMultipleDots || !isDecimal) {
            valueStr = valueStr.replace(/\./g, '');
        }
    }
    
    const num = parseFloat(valueStr.replace(/[^\d.]/g, ''));
    return isNaN(num) ? null : Math.round(num * 100) / 100;
};

const parseDate = (value: string | null): string | null => {
    if (!value) return null;
    // Handles DD/MM/YYYY, DD.MM.YYYY, and common OCR mistakes for separators
    const match = cleanOcrMistakes(value).match(/(\d{2})[\/Il.]?(\d{2})[\/Il.]?(\d{4})/);
    if (!match) return null;
    const [, day, month, year] = match;
    const dayInt = parseInt(day, 10);
    const monthInt = parseInt(month, 10);

    // Basic date validation
    if (dayInt === 0 || dayInt > 31 || monthInt === 0 || monthInt > 12) {
        return null;
    }
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

export const extractBoletoInfo = async (pdfBuffer: Buffer, fileName: string): Promise<Omit<Boleto, 'id' | 'status' | 'fileData' | 'comments' | 'companyId'>> => {
    const text = await getPdfTextContent(pdfBuffer);
    const normalizedText = text.replace(/ +/g, ' ').trim();

    const patterns = {
        // Regexes are multiline-aware and look for the last valid number after the label.
        amountValorDocumento: /(?:\(=\))?\s*Valor do Documento[\s\S]*?(\b[\d.,\s]+\b)/gi,
        amountValorCobrado: /(?:\(=\))?\s*Valor Cobrado[\s\S]*?(\b[\d.,\s]+\b)/gi,
        discount: /(?:\(-\))?\s*(?:Desconto|Abatimento)[\s\S]*?(\b[\d.,\s]+\b)/gi,
        interestAndFines: /(?:\(\+\))?\s*(?:Juros|Multa|Outros Acréscimos)[\s\S]*?(\b[\d.,\s]+\b)/gi,
        documentDate: /(?:Data do Documento)[\s:\n]*(\d{2}[\/Il.]?\d{2}[\/Il.]?\d{4})/i,
        dueDate: /(?:Vencimento)[\s:\n]*(\d{2}[\/Il.]?\d{2}[\/Il.]?\d{4})/i,
        recipient: /(?:Beneficiário|Cedente)[\s.:\n]*?([\s\S]*?)(?=\b(?:Data (?:do )?Documento|Vencimento|Nosso Número|Agência)\b)/i,
        drawee: /(?:Pagador|Sacado)[\s.:\n]*?([\s\S]*?)(?=\b(?:Instruções|Descrição do Ato)\b|Autenticação Mecânica)/i,
        guideNumberDoc: /(?:N[ºo\.]?\s?(?:do\s)?Documento(?:[\/]?Guia)?)[\s.:\n]*?(\S+)/i,
        guideNumberNosso: /(?:Nosso\sN[úu]mero)[\s.:\n]*?(\S+)/i,
        pixQrCodeText: /(000201\S{100,})/i,
    };
    
    const findLastValidMatch = (regex: RegExp) => {
        const matches = [...normalizedText.matchAll(regex)];
        return matches.length > 0 ? matches[matches.length - 1][1] : null;
    }
    
    const barcode = extractBarcode(normalizedText);

    const documentAmountStr = findLastValidMatch(patterns.amountValorDocumento);
    const documentAmount = parseCurrency(documentAmountStr);

    const valorCobradoStr = findLastValidMatch(patterns.amountValorCobrado);
    let amount = parseCurrency(valorCobradoStr);

    // Fallback to document amount if charged amount is not found or is zero
    if (amount === null || amount === 0) {
        amount = documentAmount;
    }
    
    const discountStr = findLastValidMatch(patterns.discount);
    const discount = parseCurrency(discountStr);

    const interestStr = findLastValidMatch(patterns.interestAndFines);
    const interestAndFines = parseCurrency(interestStr);

    const documentDate = parseDate(normalizedText.match(patterns.documentDate)?.[1] || null);
    const dueDate = parseDate(normalizedText.match(patterns.dueDate)?.[1] || null);

    const extractEntity = (match: RegExpMatchArray | null): string | null => {
        if (!match || !match[1]) return null;
        return match[1].trim().replace(/\s*\n\s*/g, ' / ').replace(/\s{2,}/g, ' ').replace(/[-_]+/g, ' ').trim();
    };

    const recipient = extractEntity(normalizedText.match(patterns.recipient));
    const drawee = extractEntity(normalizedText.match(patterns.drawee));

    let guideNumberMatch = normalizedText.match(patterns.guideNumberDoc);
    if (!guideNumberMatch) {
        guideNumberMatch = normalizedText.match(patterns.guideNumberNosso);
    }
    const guideNumber = guideNumberMatch ? guideNumberMatch[1].trim() : null;

    const pixQrCodeTextMatch = normalizedText.match(patterns.pixQrCodeText);
    const pixQrCodeText = pixQrCodeTextMatch ? pixQrCodeTextMatch[0].trim() : null;

    return {
        recipient,
        drawee,
        documentDate,
        dueDate,
        documentAmount,
        amount,
        discount,
        interestAndFines,
        barcode,
        guideNumber,
        pixQrCodeText,
        fileName,
        extractedData: { /* Store raw values if needed in future */ },
    };
};