import { Boleto } from '../../types';
import * as pdfjs from 'pdfjs-dist';
import { Buffer } from 'buffer';

// FIX: Removed explicit `require.resolve` to avoid TypeScript type errors.
// pdf.js will internally require this path in a Node.js environment.
pdfjs.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.js';

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
        discount: /(?:(?:\(-\)\s*)?(?:Desconto|Abatimento|Outras Deduções))[\s.:\n]*?R?\$?\s*([\d.,]+)/i,
        interestAndFines: /(?:(?:\(\+\)\s*)?(?:Juros|Multa|Acréscimos|Outros Acréscimos))[\s.:\n]*?R?\$?\s*([\d.,]+)/i,
        dueDate: /(?:Vencimento)[\s.:\n]*?(\d{2}[\/Il]\d{2}[\/Il]\d{4})/i,
        documentDate: /(?:Data (?:do )?Documento)[\s.:\n]*?(\d{2}[\/Il]\d{2}[\/Il]\d{4})/i,
        guideNumber: /(?:N[ºo\.]?\s?(?:do\s)?Documento|Nosso\sN[úu]mero|Guia)[\s.:\n]*?([^\s\n][^\n]*?)(?=\s{2,}|[\r\n]|$)/i,
        recipient: /(?:Beneficiário|Cedente)[\s.:\n]*?([^\s\n][^\n]*?)(?=\s{2,}|[\r\n]|$)/i,
        drawee: /(?:Pagador|Sacado)[\s.:\n]*?([^\s\n][^\n]*?)(?=\s{2,}|[\r\n]|$)/i,
        pixQrCodeText: /(000201\S{100,})/i,
    };

    const barcodeMatch = normalizedText.match(patterns.barcode);
    // Prioritize Valor Cobrado
    let amountMatch = normalizedText.match(patterns.amountValorCobrado);
    if (!amountMatch) {
        amountMatch = normalizedText.match(patterns.amountValorDocumento);
    }
    const discountMatch = normalizedText.match(patterns.discount);
    const interestAndFinesMatch = normalizedText.match(patterns.interestAndFines);
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
        // Remove all characters except digits and the last comma/period
        valueStr = valueStr.replace(/[^\d,.]/g, '');
        // Standardize decimal separator to a period
        if (valueStr.includes(',')) {
            // Replace all dots (thousands separators) and then replace comma with dot
            valueStr = valueStr.replace(/\./g, '').replace(',', '.');
        } else if (valueStr.includes('.')) {
            // If there are multiple dots, assume the last one is the decimal
            const parts = valueStr.split('.');
            if (parts.length > 2) {
                valueStr = parts.slice(0, -1).join('') + '.' + parts.slice(-1);
            }
        }
        if (isNaN(parseFloat(valueStr))) return null;
        return parseFloat(valueStr);
    };

    const amount = parseCurrency(amountMatch);
    const discount = parseCurrency(discountMatch);
    const interestAndFines = parseCurrency(interestAndFinesMatch);
    
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
        discount,
        interestAndFines,
        barcode,
        guideNumber,
        pixQrCodeText: pixQrCodeTextMatch ? pixQrCodeTextMatch[0].trim() : null,
        fileName: fileName,
    };
};