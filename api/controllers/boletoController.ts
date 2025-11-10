
import { Request, Response } from 'express';
import { pool } from '../../config/db';
import { Boleto, BoletoStatus } from '../../types';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { Buffer } from 'buffer';
import { extractBoletoInfoWithPython } from '../services/pythonService';
import { appConfig } from '../services/configService';


// --- Controller Functions ---

// Helper to safely parse decimal strings from DB to numbers
const parseDecimal = (value: string | null): number | null => {
    if (value === null || value === undefined) return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
};

// Helper to validate date strings before DB insertion
const isValidDateString = (dateStr: string | null | undefined): boolean => {
    if (!dateStr || dateStr === 'null') return true; // null is a valid state
    // Checks for YYYY-MM-DD format and ensures it's a real calendar date.
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateStr.match(regex)) return false;
    const d = new Date(dateStr);
    // Check if the date is valid and its ISO string representation matches.
    return d instanceof Date && !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dateStr;
};


// Helper to map database snake_case to frontend camelCase
const mapDbBoletoToBoleto = (dbBoleto: any): Boleto => {
    // A file_data can be very large, so it's best to handle its absence gracefully
    const fileData = dbBoleto.file_data instanceof Buffer 
        ? dbBoleto.file_data.toString('base64') 
        : (typeof dbBoleto.file_data === 'string' ? dbBoleto.file_data : '');

    let extractedDataParsed = null;
    if (dbBoleto.extracted_data) {
        try {
            extractedDataParsed = typeof dbBoleto.extracted_data === 'string' ? JSON.parse(dbBoleto.extracted_data) : dbBoleto.extracted_data;
        } catch(e) {
            console.error('Could not parse extracted_data from DB for boleto ID:', dbBoleto.id);
        }
    }

    return {
        id: dbBoleto.id,
        recipient: dbBoleto.recipient,
        drawee: dbBoleto.drawee,
        documentDate: dbBoleto.document_date,
        dueDate: dbBoleto.due_date,
        documentAmount: parseDecimal(dbBoleto.document_amount),
        amount: parseDecimal(dbBoleto.amount),
        discount: parseDecimal(dbBoleto.discount),
        interestAndFines: parseDecimal(dbBoleto.interest_and_fines),
        barcode: dbBoleto.barcode,
        guideNumber: dbBoleto.guide_number,
        pixQrCodeText: dbBoleto.pix_qr_code_text,
        status: dbBoleto.status,
        fileName: dbBoleto.file_name,
        fileData: fileData,
        companyId: dbBoleto.company_id,
        comments: dbBoleto.comments,
        extractedData: extractedDataParsed,
        detailedCosts: extractedDataParsed?.detailedCosts || null,
        createdAt: dbBoleto.created_at,
        updatedAt: dbBoleto.updated_at,
    };
};

// FIX: Correctly type Express request handler to resolve property access errors.
export const getBoletos = async (req: Request, res: Response) => {
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

// FIX: Correctly type Express request handler to resolve property access errors.
export const getBoletoById = async (req: Request, res: Response) => {
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

// FIX: Correctly type Express request handler to resolve property access errors.
export const extractBoleto = async (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        const extractedData = await extractBoletoInfoWithPython(req.file.buffer, req.file.originalname);
        
        if (extractedData.amount === null || extractedData.amount === undefined) {
            return res.status(400).json({ message: 'amountNotFoundErrorText' });
        }

        if (extractedData.amount === 0) {
             return res.status(400).json({ message: 'freeBoletoErrorText' });
        }
        
        if (!extractedData.barcode) {
            return res.status(400).json({ message: 'invalidBarcodeErrorText' });
        }

        res.status(200).json({ ...extractedData, fileData: req.file.buffer.toString('base64') });

    } catch (error: any) {
        console.error("Error extracting boleto data:", error);
        return res.status(500).json({ message: 'pdfProcessingError', details: error.message || 'Failed to parse PDF content.' });
    }
};

// FIX: Correctly type Express request handler to resolve property access errors.
export const saveBoleto = async (req: Request, res: Response) => {
    const user = req.user!;
    const { boletoData, companyId } = req.body;

    if (!isValidDateString(boletoData.documentDate) || !isValidDateString(boletoData.dueDate)) {
        return res.status(400).json({ message: 'Data inválida detectada no PDF. As datas devem ser válidas e no formato AAAA-MM-DD.' });
    }

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
            comments: newBoleto.comments || null,
            extracted_data: JSON.stringify(boletoData)
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

// FIX: Correctly type Express request handler to resolve property access errors.
export const updateBoletoStatus = async (req: Request, res: Response) => {
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

// FIX: Correctly type Express request handler to resolve property access errors.
export const updateBoletoComments = async (req: Request, res: Response) => {
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

// FIX: Correctly type Express request handler to resolve property access errors.
export const deleteBoleto = async (req: Request, res: Response) => {
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