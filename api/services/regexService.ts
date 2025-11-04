

import { Boleto } from '../../types';
import * as pdfjs from 'pdfjs-dist';
import { Buffer } from 'buffer';

const getPdfTextContent = async (pdfBuffer: Buffer): Promise<string> => {
    const data = new Uint8Array(pdfBuffer);
    const pdf = await pdfjs.getDocument(data).promise;
    const numPages = pdf.numPages;
    let fullText = '';

    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        if (textContent.items.length === 0) continue;

        const lines: { [key: number]: any[] } = {};
        for(const item of textContent.items) {
            const y = Math.round((item as any).transform[5]);
            if (!lines[y]) lines[y] = [];
            lines[y].push(item);
        }

        const sortedLines = Object.keys(lines)
            .sort((a, b) => Number(b) - Number(a))
            .map(y => lines[parseInt(y, 10)]);

        const pageText = sortedLines.map(lineItems => {
            return lineItems
                .sort((a, b) => (a as any).transform[4] - (b as any).transform[4])
                .map(item => (item as any).str)
                .join(' ');
        }).join('\n');

        fullText += pageText + '\n\n';
    }
    return fullText;
};

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

export const extractBoletoInfo = async (pdfBuffer: Buffer, fileName: string): Promise<Omit<Boleto, 'id' | 'status' | 'fileData' | 'comments' | 'companyId'>> => {
    const text = await getPdfTextContent(pdfBuffer);

    const normalizedText = text.replace(/ +/g, ' ').trim();

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

    const barcodeMatch = normalizedText.match(patterns.barcode);
    // Prioritize Valor Cobrado, then Valor Documento, then a generic fallback
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
        let valueStr = match[1].trim();
        valueStr = cleanOcrMistakes(valueStr);

        if (!/\d/.test(valueStr)) return null;

        const hasComma = valueStr.includes(',');
        const hasDot = valueStr.includes('.');

        if (hasComma) {
            // Brazilian format (e.g., 1.234,56). Comma is decimal separator.
            valueStr = valueStr.replace(/\./g, '').replace(',', '.');
        } else if (hasDot) {
            // No comma, only dot(s). Ambiguous (1.234 vs 123.45).
            const lastDotIndex = valueStr.lastIndexOf('.');
            const isDecimal = valueStr.length - lastDotIndex - 1 === 2;
            const hasMultipleDots = (valueStr.match(/\./g) || []).length > 1;

            if (hasMultipleDots || !isDecimal) {
                // Treat all dots as thousands separators (e.g., 1.234.567 or 1.234)
                valueStr = valueStr.replace(/\./g, '');
            }
            // Otherwise, it's likely a decimal dot (e.g., 123.45), so we leave it.
        }
        
        // Final cleanup to ensure it's a valid number format
        const num = parseFloat(valueStr.replace(/[^\d.]/g, ''));
        return isNaN(num) ? null : num;
    };

    const amount = parseCurrency(amountMatch);
    
    const parseDate = (match: RegExpMatchArray | null): string | null => {
        if (!match || !match[1]) return null;
        const [day, month, year] = match[1].split(/[\/Il]/);
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
        fileName: fileName,
    };
};