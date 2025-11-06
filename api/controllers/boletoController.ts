
import express from 'express';
import { pool } from '../../config/db';
import { Boleto, BoletoStatus } from '../../types';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { Buffer } from 'buffer';
import pdfParse from 'pdf-parse';

// --- PDF Parsing and Data Extraction Logic (Node.js Implementation) ---

const getPdfTextContent = async (pdfBuffer: Buffer): Promise<string> => {
    const data = await pdfParse(pdfBuffer);
    return data.text;
};

const cleanOcrMistakes = (value: string | null): string => {
    if (!value) return '';
    return value
        .replace(/O|o|º/g, '0')
        .replace(/I|l/g, '1')
        .replace(/S|s|§/g, '5')
        .replace(/B/g, '8')
        .replace(/Z|z/g, '2')
        .replace(/G/g, '6');
};

const extractBarcode = (text: string): string | null => {
    const patternFormatted = /\b(\d{5}\.\d{5,})\s+(\d{5}\.\d{6,})\s+(\d{5}\.\d{6,})\s+?(\d{1,})\s+?(\d{14,})\b/;
    const patternSolid = /\b(\d{47,48})\b/;
    
    const cleanedText = cleanOcrMistakes(text);

    let match = cleanedText.match(patternFormatted);
    if (match) {
        return match.slice(1).join('').replace(/[^\d]/g, '');
    }

    match = cleanedText.match(patternSolid);
    if (match) {
        return match[1];
    }
    
    return null;
};

const parseCurrency = (valueStr: string | null): number | null => {
    if (!valueStr) return null;
    
    let cleanedStr = String(valueStr).trim().toUpperCase().replace('R$', '').replace('RS', '').trim();
    
    if (cleanedStr.includes(',') && cleanedStr.includes('.')) {
        if (cleanedStr.lastIndexOf('.') < cleanedStr.lastIndexOf(',')) {
             cleanedStr = cleanedStr.replace(/\./g, '').replace(',', '.');
        } else {
            cleanedStr = cleanedStr.replace(/,/g, '');
        }
    } else if (cleanedStr.includes(',')) {
        cleanedStr = cleanedStr.replace(',', '.');
    }

    const numericPart = cleanedStr.replace(/[^\d.]/g, '');
    if (!numericPart) return null;

    const num = parseFloat(numericPart);
    return isNaN(num) ? null : Math.round(num * 100) / 100;
};

const parseDate = (dateStr: string | null): string | null => {
    if (!dateStr) return null;
    const match = String(dateStr).match(/(\d{2})[/\sIl](\d{2})[/\sIl](\d{4})/);
    if (match) {
        const [_, day, month, year] = match;
        if (parseInt(month, 10) > 0 && parseInt(month, 10) <= 12 && parseInt(day, 10) > 0 && parseInt(day, 10) <= 31 && parseInt(year, 10) > 1900) {
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
    }
    return null;
};

const extractField = (text: string, pattern: RegExp): string | null => {
    const match = text.match(pattern);
    return match && match[1] ? match[1].trim() : null;
};

const extractMultilineField = (text: string, pattern: RegExp): string | null => {
    const match = text.match(pattern);
    if (!match || !match[1]) return null;
    
    let result = match[1].trim();
    result = result.replace(/\s*\n\s*/g, ' / ');
    result = result.replace(/\s{2,}/g, ' ');
    result = result.replace(/[-_]+/g, ' ').trim();
    return result || null;
};

const extractBoletoDataFromPdf = async (pdfBuffer: Buffer): Promise<any> => {
    const fullText = await getPdfTextContent(pdfBuffer);
    
    const patterns = {
        dueDate: /(?:Vencimento)[\s:.]*(\d{2}[/\sIl]\d{2}[/\sIl]\d{4})/i,
        documentDate: /(?:Data\s(?:do\s)?Documento)[\s:.]*(\d{2}[/\sIl]\d{2}[/\sIl]\d{4})/i,
        documentAmount: /(?:\(=\)\s*Valor\sdo\sDocumento|Valor\sdo\sDocumento)[\s\S]*?(\b[\d.,]+\b)/i,
        amountCharged: /(?:\(=\)\s*Valor\sCobrado)[\s\S]*?(\b[\d.,]+\b)/i,
        discount: /(?:\(-\)\s*Desconto\s*\/\s*Abatimento)[\s\S]*?(\b[\d.,]+\b)/i,
        interestAndFines: /(?:\(\+\)\s*Juros\s*\/\s*Multa|\(\+\)\s*Outros\sAcr.scimos)[\s\S]*?(\b[\d.,]+\b)/i,
        guideNumberDoc: /(?:N[ºo\.]?\s?Documento(?:[\/]?Guia)?)[\s.:\n]*?([^\s\n]+)/i,
        guideNumberNosso: /(?:Nosso\sN[úu]mero)[\s.:\n]*?([^\s\n]+)/i,
        pixQrCodeText: /(000201\S{100,})/i,
        recipient: /(?:Benefici[áa]rio|Cedente)[\s.:\n]*([\s\S]*?)(?=\b(?:Data Process|Data (?:do )?Documento|Vencimento|Nosso Número|Ag.ncia)\b)/is,
        drawee: /(?:Pagador|Sacado)[\s.:\n]*([\s\S]*?)(?=\b(?:Sacador\s\/\sAvalista|Instruções|Descrição do Ato|Autenticaç)\b|Mora\/Multa)/is,
    };
    
    const data: any = {};

    data.dueDate = parseDate(extractField(fullText, patterns.dueDate));
    data.documentDate = parseDate(extractField(fullText, patterns.documentDate));
    
    data.documentAmount = parseCurrency(extractField(fullText, patterns.documentAmount));
    data.discount = parseCurrency(extractField(fullText, patterns.discount));
    data.interestAndFines = parseCurrency(extractField(fullText, patterns.interestAndFines));
    
    const amountCharged = parseCurrency(extractField(fullText, patterns.amountCharged));
    data.amount = (amountCharged !== null && amountCharged > 0) ? amountCharged : data.documentAmount;

    let guideNumber = extractField(fullText, patterns.guideNumberDoc);
    if (!guideNumber) {
        guideNumber = extractField(fullText, patterns.guideNumberNosso);
    }
    data.guideNumber = guideNumber;

    data.recipient = extractMultilineField(fullText, patterns.recipient);
    data.drawee = extractMultilineField(fullText, patterns.drawee);
    
    data.barcode = extractBarcode(fullText);
    data.pixQrCodeText = extractField(fullText, patterns.pixQrCodeText);
    
    return data;
};


// --- Controller Functions ---

// Helper to map database snake_case to frontend camelCase
const mapDbBoletoToBoleto = (dbBoleto: any): Boleto => {
    // A file_data can be very large, so it's best to handle its absence gracefully
    const fileData = dbBoleto.file_data instanceof Buffer 
        ? dbBoleto.file_data.toString('base64') 
        : (typeof dbBoleto.file_data === 'string' ? dbBoleto.file_data : '');

    return {
        id: dbBoleto.id,
        recipient: dbBoleto.recipient,
        drawee: dbBoleto.drawee,
        documentDate: dbBoleto.document_date,
        dueDate: dbBoleto.due_date,
        documentAmount: dbBoleto.document_amount,
        amount: dbBoleto.amount,
        discount: dbBoleto.discount,
        interestAndFines: dbBoleto.interest_and_fines,
        barcode: dbBoleto.barcode,
        guideNumber: dbBoleto.guide_number,
        pixQrCodeText: dbBoleto.pix_qr_code_text,
        status: dbBoleto.status,
        fileName: dbBoleto.file_name,
        fileData: fileData,
        companyId: dbBoleto.company_id,
        comments: dbBoleto.comments,
    };
};

export const getBoletos = async (req: express.Request, res: express.Response) => {
  const user = req.user!;
  try {
    if (user.role !== 'admin' && !user.companyId) {
      return res.json([]);
    }

    // Select all fields including file_data, as the frontend needs it for cards.
    let query = 'SELECT * FROM boletos';
    const params: (string | null)[] = [];

    if (user.role !== 'admin') {
      query += ' WHERE company_id = ?';
      params.push(user.companyId);
    } else if (req.query.companyId) {
      query += ' WHERE company_id = ?';
      params.push(req.query.companyId as string);
    }
    query += ' ORDER BY created_at DESC';

    const [boletosFromDb] = await pool.query<RowDataPacket[]>(query, params);
    const boletos = boletosFromDb.map(mapDbBoletoToBoleto);
    res.json(boletos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while fetching boletos.' });
  }
};

export const getBoletoById = async (req: express.Request, res: express.Response) => {
    const user = req.user!;
    const boletoId = req.params.id;
    try {
        let query = 'SELECT * FROM boletos WHERE id = ?';
        const params: (string | null)[] = [boletoId];

        if (user.role !== 'admin') {
            if (!user.companyId) {
                return res.status(403).json({ message: 'User is not associated with a company.' });
            }
            query += ' AND company_id = ?';
            params.push(user.companyId);
        }
        
        const [boletos] = await pool.query<RowDataPacket[]>(query, params);

        if (boletos.length === 0) {
            return res.status(404).json({ message: 'Boleto not found or access denied.' });
        }

        res.json(mapDbBoletoToBoleto(boletos[0]));
    } catch (error) {
        console.error(`Error fetching boleto with ID ${boletoId}:`, error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const extractBoleto = async (req: express.Request, res: express.Response) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    try {
        const extractedData = await extractBoletoDataFromPdf(req.file.buffer);
        extractedData.fileName = req.file.originalname;

        if (extractedData.amount === null || extractedData.amount === undefined) {
             return res.status(400).json({ message: 'amountNotFoundErrorText' });
        }

        res.status(200).json({ ...extractedData, fileData: req.file.buffer.toString('base64') });
    } catch (error: any) {
        console.error("Error extracting boleto data:", error);
        res.status(500).json({ message: 'pdfProcessingError' });
    }
};

export const saveBoleto = async (req: express.Request, res: express.Response) => {
    const user = req.user!;
    const { boletoData, companyId } = req.body;

    let targetCompanyId: string | null;
    if (user.role === 'admin') {
        if (!companyId) {
            return res.status(400).json({ message: 'adminMustSelectCompanyErrorText' });
        }
        targetCompanyId = companyId;
    } else {
        if (!user.companyId) {
            return res.status(400).json({ message: 'userHasNoCompanyErrorText' });
        }
        targetCompanyId = user.companyId;
    }
    
    if (!targetCompanyId) {
        return res.status(500).json({ message: 'Internal Server Error: Target company ID was not determined.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        if (boletoData.barcode) {
             const [existing] = await connection.query<RowDataPacket[]>('SELECT id FROM boletos WHERE barcode = ? AND company_id = ?', [boletoData.barcode, targetCompanyId]);
             if (existing.length > 0) {
                 await connection.rollback();
                 return res.status(409).json({ message: `Duplicate barcode: ${boletoData.guideNumber || boletoData.barcode}`});
             }
        }

        const newBoleto: Boleto = {
            id: uuidv4(),
            ...boletoData,
            status: BoletoStatus.TO_PAY,
            comments: null,
            companyId: targetCompanyId,
        };
        
        // Create an explicit object with snake_case keys matching the database schema
        // This prevents any ambiguity and ensures undefined values are converted to null.
        const dbInsertObject = {
            id: newBoleto.id,
            user_id: user.id,
            company_id: newBoleto.companyId,
            recipient: newBoleto.recipient || null,
            drawee: newBoleto.drawee || null,
            document_date: newBoleto.documentDate === 'null' ? null : newBoleto.documentDate,
            due_date: newBoleto.dueDate === 'null' ? null : newBoleto.dueDate,
            document_amount: newBoleto.documentAmount || null,
            amount: newBoleto.amount || null,
            discount: newBoleto.discount || null,
            interest_and_fines: newBoleto.interestAndFines || null,
            barcode: newBoleto.barcode || null,
            guide_number: newBoleto.guideNumber || null,
            pix_qr_code_text: newBoleto.pixQrCodeText || null,
            status: newBoleto.status,
            file_name: newBoleto.fileName,
            file_data: newBoleto.fileData,
            comments: newBoleto.comments || null
        };

        const columns = Object.keys(dbInsertObject);
        const values = Object.values(dbInsertObject);
        const placeholders = columns.map(() => '?').join(', ');
        const sql = `INSERT INTO boletos (${columns.join(', ')}) VALUES (${placeholders})`;
        
        await connection.query(sql, values);

        await connection.query(
            'INSERT INTO activity_logs (id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
            [
                uuidv4(),
                user.id,
                user.username,
                'CREATE_BOLEto',
                `Created new boleto '${newBoleto.guideNumber || newBoleto.recipient || 'N/A'}' for company ID ${targetCompanyId}.`
            ]
        );

        await connection.commit();
        
        const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM boletos WHERE id = ?', [newBoleto.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Failed to retrieve saved boleto' });
        }
        res.status(201).json(mapDbBoletoToBoleto(rows[0]));

    } catch (error: any) {
        await connection.rollback();
        console.error("Error saving boleto:", error);
        res.status(500).json({ message: error.message || 'Failed to save boleto' });
    } finally {
        connection.release();
    }
};

export const updateBoletoStatus = async (req: express.Request, res: express.Response) => {
    const { status } = req.body;
    const { id } = req.params;
    const user = req.user!;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [beforeUpdate] = await connection.query<RowDataPacket[]>('SELECT status, guide_number FROM boletos WHERE id = ?', [id]);
        if (beforeUpdate.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Boleto not found' });
        }
        const oldStatus = beforeUpdate[0].status;
        const guideNumber = beforeUpdate[0].guide_number || 'N/A';

        await connection.query('UPDATE boletos SET status = ? WHERE id = ?', [status, id]);

        await connection.query(
            'INSERT INTO activity_logs (id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
            [
                uuidv4(),
                user.id,
                user.username,
                'UPDATE_BOLETO_STATUS',
                `Updated status for boleto '${guideNumber}' from '${oldStatus}' to '${status}'.`
            ]
        );

        const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM boletos WHERE id = ?', [id]);
        await connection.commit();

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Boleto not found after update' });
        }
        res.json(mapDbBoletoToBoleto(rows[0]));
    } catch (error) {
        await connection.rollback();
        console.error(`Error updating status for boleto ${id}:`, error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
};

export const updateBoletoComments = async (req: express.Request, res: express.Response) => {
    const { comments } = req.body;
    const { id } = req.params;
    const user = req.user!;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        const [beforeUpdate] = await connection.query<RowDataPacket[]>('SELECT guide_number FROM boletos WHERE id = ?', [id]);
        if (beforeUpdate.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Boleto not found' });
        }
        const guideNumber = beforeUpdate[0].guide_number || 'N/A';

        await connection.query('UPDATE boletos SET comments = ? WHERE id = ?', [comments, id]);

        await connection.query(
            'INSERT INTO activity_logs (id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
            [
                uuidv4(),
                user.id,
                user.username,
                'UPDATE_BOLETO_COMMENT',
                `Updated comments for boleto '${guideNumber}'.`
            ]
        );

        const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM boletos WHERE id = ?', [id]);
        await connection.commit();

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Boleto not found after update' });
        }
        res.json(mapDbBoletoToBoleto(rows[0]));
    } catch (error) {
        await connection.rollback();
        console.error(`Error updating comments for boleto ${id}:`, error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
};

export const deleteBoleto = async (req: express.Request, res: express.Response) => {
    const user = req.user!;
    const { id } = req.params;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        const [beforeDelete] = await connection.query<RowDataPacket[]>('SELECT guide_number FROM boletos WHERE id = ?', [id]);
        if (beforeDelete.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Boleto not found' });
        }
        const guideNumber = beforeDelete[0].guide_number || 'N/A';
        
        await connection.query('DELETE FROM boletos WHERE id = ?', [id]);
        
        await connection.query(
            'INSERT INTO activity_logs (id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
            [
                uuidv4(),
                user.id,
                user.username,
                'DELETE_BOLETO',
                `Deleted boleto '${guideNumber}' (ID: ${id}).`
            ]
        );
        
        await connection.commit();
        res.json({ message: 'Boleto deleted' });
    } catch (error) {
        await connection.rollback();
        console.error(`Error deleting boleto ${id}:`, error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
};