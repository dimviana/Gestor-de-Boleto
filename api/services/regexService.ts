import { Boleto } from '../../types';
import pdfParse from 'pdf-parse';
import { Buffer } from 'buffer';

const getPdfTextContent = async (pdfBuffer: Buffer): Promise<string> => {
    const data = await pdfParse(pdfBuffer);
    return data.text;
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
    const pattern1 = /\b(\d{5}\.?\d{5}\s+\d{5}\.?\d{6}\s+\d{5}\.?\d{6}\s+\d\s+\d{14})\b/;
    const pattern2 = /\b(\d{47,48})\b/;
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

    if (hasComma && hasDot) {
        valueStr = valueStr.replace(/\./g, '').replace(',', '.');
    } else if (hasComma && !hasDot) {
        const parts = valueStr.split(',');
        if (parts[1] && parts[1].length === 2) {
            valueStr = parts[0].replace(/\./g, '') + '.' + parts[1];
        } else {
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
    return isNaN(num) ? null : Math.round(num * 100) / 100;
};

const parseDate = (value: string | null): string | null => {
    if (!value) return null;
    const match = cleanOcrMistakes(value).match(/(\d{2})[\/Il]?(\d{2})[\/Il]?(\d{4})/);
    if (!match) return null;
    const [, day, month, year] = match;
    if (parseInt(day, 10) === 0 || parseInt(month, 10) === 0 || parseInt(month, 10) > 12) return null;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

export const extractBoletoInfo = async (pdfBuffer: Buffer, fileName: string): Promise<Omit<Boleto, 'id' | 'status' | 'fileData' | 'comments' | 'companyId'>> => {
    const text = await getPdfTextContent(pdfBuffer);
    const normalizedText = text.replace(/ +/g, ' ').trim();

    const patterns = {
        amountValorDocumento: /(?:\(=\))?\s*Valor do Documento[^\d\r\n]*?([\d.,]{3,})/i,
        amountValorCobrado: /(?:\(=\))?\s*Valor Cobrado[^\d\r\n]*?([\d.,]{3,})/i,
        discount: /(?:\(-\))?\s*(?:Desconto|Abatimento)[^\d\r\n]*?([\d.,]{3,})/i,
        interestAndFines: /(?:\(\+\))?\s*(?:Juros|Multa|Outros Acréscimos)[^\d\r\n]*?([\d.,]{3,})/i,
        documentDate: /(?:Data do Documento)[\s:\n]*(\d{2}[\/Il]\d{2}[\/Il]\d{4})/i,
        dueDate: /(?:Vencimento)[\s:\n]*(\d{2}[\/Il]\d{2}[\/Il]\d{4})/i,
        recipient: /(?:Beneficiário|Cedente)[\s.:\n]*?([\s\S]*?)(?=\b(?:Data (?:do )?Documento|Vencimento|Nosso Número|Agência)\b)/i,
        drawee: /(?:Pagador|Sacado)[\s.:\n]*?([\s\S]*?)(?=\b(?:Instruções|Descrição do Ato)\b|Autenticação Mecânica)/i,
        guideNumberDoc: /(?:N[ºo\.]?\s?(?:do\s)?Documento(?:[\/]?Guia)?)[\s.:\n]*?(\S+)/i,
        guideNumberNosso: /(?:Nosso\sN[úu]mero)[\s.:\n]*?(\S+)/i,
        pixQrCodeText: /(000201\S{100,})/i,
    };
    
    const barcode = extractBarcode(normalizedText);

    const documentAmountMatch = normalizedText.match(patterns.amountValorDocumento);
    const documentAmount = parseCurrency(documentAmountMatch ? documentAmountMatch[1] : null);

    const valorCobradoMatch = normalizedText.match(patterns.amountValorCobrado);
    let amount = parseCurrency(valorCobradoMatch ? valorCobradoMatch[1] : null);

    if (amount === null || amount === 0) {
        amount = documentAmount;
    }
    
    const discountMatch = normalizedText.match(patterns.discount);
    const discount = parseCurrency(discountMatch ? discountMatch[1] : null);

    const interestMatch = normalizedText.match(patterns.interestAndFines);
    const interestAndFines = parseCurrency(interestMatch ? interestMatch[1] : null);

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
    };
};