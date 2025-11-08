import { Boleto } from '../../types';
import pdfParse from 'pdf-parse';
import { Buffer } from 'buffer';

const getPdfTextContent = async (pdfBuffer: Buffer): Promise<string> => {
    try {
        const data = await (pdfParse as any)(pdfBuffer);
        return data.text;
    } catch (error) {
        console.error("Error parsing PDF with pdf-parse:", error);
        throw new Error("Could not read text content from PDF file.");
    }
};

const cleanText = (value: string | null): string => {
    if (!value) return '';
    return value
        .replace(/\s*\n\s*/g, ' / ')
        .replace(/\s{2,}/g, ' ')
        .replace(/[-_]+/g, ' ')
        .trim();
};

const extractBarcode = (text: string): string | null => {
    const patterns = [
        /(\d{5}\.\d{5})\s+(\d{5}\.\d{6})\s+(\d{5}\.\d{6})\s+(\d)\s+(\d{14})/,
        /\b(\d{5}\.?\d{5}\s+\d{5}\.?\d{6}\s+\d{5}\.?\d{6}\s+\d\s+\d{14})\b/,
        /\b(\d{47,48})\b/
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return match[0].replace(/[^\d]/g, '');
        }
    }
    return null;
};

const parseCurrency = (value: string | null): number | null => {
    if (!value) return null;
    let valueStr = value.trim().replace(/R\$\s*/gi, '').trim();
    if (!/\d/.test(valueStr)) return null;

    const hasComma = valueStr.includes(',');
    const hasDot = valueStr.includes('.');

    if (hasComma && hasDot) {
        valueStr = valueStr.replace(/\./g, '').replace(',', '.');
    } else if (hasComma) {
        valueStr = valueStr.replace(',', '.');
    }
    
    const num = parseFloat(valueStr.replace(/[^\d.]/g, ''));
    return isNaN(num) ? null : Math.round(num * 100) / 100;
};

const parseDate = (value: string | null): string | null => {
    if (!value) return null;
    const match = value.match(/(\d{2})\/?(\d{2})\/?(\d{4})/);
    if (!match) return null;
    const [, day, month, year] = match;
    const dayInt = parseInt(day, 10);
    const monthInt = parseInt(month, 10);
    const yearInt = parseInt(year, 10);

    if (dayInt > 0 && dayInt <= 31 && monthInt > 0 && monthInt <= 12 && yearInt > 1900) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return null;
};

export const extractBoletoInfo = async (pdfBuffer: Buffer, fileName: string): Promise<Omit<Boleto, 'id' | 'status' | 'fileData' | 'comments' | 'companyId'>> => {
    const text = await getPdfTextContent(pdfBuffer);
    const normalizedText = text.replace(/ +/g, ' ').trim();

    const patterns = {
        amountValorDocumento: /(?:\(=\))?\s*Valor do Documento[\s\S]*?(R\$\s*[\d,.]+)/gi,
        amountValorCobrado: /(?:\(=\))?\s*Valor Cobrado[\s\S]*?(R\$\s*[\d,.]+)/gi,
        discount: /(?:\(-\))?\s*(?:Desconto|Abatimento)[\s\S]*?(R\$\s*[\d,.]+)/gi,
        interestAndFines: /(?:\(\+\))?\s*(?:Juros|Multa|Outros Acréscimos)[\s\S]*?(R\$\s*[\d,.]+)/gi,
        documentDate: /(?:Data do Documento)[\s:\n]*(\d{2}\/\d{2}\/\d{4})/i,
        dueDate: /(?:Vencimento)[\s:\n]*(\d{2}\/\d{2}\/\d{4})/i,
        recipient: /(?:Beneficiário|Cedente)[\s.:\n]*?([\s\S]*?)(?=\n\s*(?:Sacado|Pagador|Data (?:do )?Documento|Vencimento|Nosso Número|Agência|CNPJ)|AGÊNCIA \/ CÓDIGO DO BENEFICIÁRIO)/i,
        drawee: /(?:Pagador|Sacado)[\s.:\n]*?([\s\S]*?)(?=\n\s*\b(?:Instruções|Descrição|Autenticação Mecânica|FICHA DE COMPENSAÇÃO|Nosso Número)\b)/i,
        guideNumberDoc: /(?:N[ºo\.]?\s?(?:do\s)?Documento(?:[\/]?Guia)?)[\s.:\n]*?(\S+)/i,
        guideNumberNosso: /(?:Nosso\sN[úu]mero)[\s.:\n]*?(\S+)/i,
        pixQrCodeText: /(000201[a-zA-Z0-9*@$.%+/=_-]{100,})/i,
    };
    
    const findLastValidMatch = (regex: RegExp) => {
        const matches = [...normalizedText.matchAll(regex)];
        return matches.length > 0 ? matches[matches.length - 1][1] : null;
    }

    const barcode = extractBarcode(normalizedText);

    // Amounts
    const documentAmountStr = findLastValidMatch(patterns.amountValorDocumento);
    const documentAmount = parseCurrency(documentAmountStr);
    
    const valorCobradoStr = findLastValidMatch(patterns.amountValorCobrado);
    let amount = parseCurrency(valorCobradoStr);

    if (amount === null || amount === 0) {
        amount = documentAmount;
    }
    
    const discount = parseCurrency(findLastValidMatch(patterns.discount));
    const interestAndFines = parseCurrency(findLastValidMatch(patterns.interestAndFines));

    // Dates
    const documentDate = parseDate(normalizedText.match(patterns.documentDate)?.[1] || null);
    const dueDate = parseDate(normalizedText.match(patterns.dueDate)?.[1] || null);

    // Parties
    const recipient = cleanText(normalizedText.match(patterns.recipient)?.[1] || null);
    const drawee = cleanText(normalizedText.match(patterns.drawee)?.[1] || null);

    // Numbers
    let guideNumberMatch = normalizedText.match(patterns.guideNumberDoc);
    if (!guideNumberMatch) {
        guideNumberMatch = normalizedText.match(patterns.guideNumberNosso);
    }
    const guideNumber = guideNumberMatch ? guideNumberMatch[1].trim() : null;
    
    const pixQrCodeText = normalizedText.match(patterns.pixQrCodeText)?.[0].trim() || null;

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
        extractedData: {},
    };
};