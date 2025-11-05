import express from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../../config/db';
import { Boleto, BoletoStatus } from '../../types';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { extractBoletoInfo as extractWithAI } from '../services/geminiService';
import { extractBoletoInfo as extractWithRegex } from '../services/regexService';

export const getBoletos = async (req: AuthRequest, res: express.Response) => {
  const user = req.user!;
  try {
    if (user.role !== 'admin' && !user.companyId) {
      return res.json([]);
    }

    let query = 'SELECT id, recipient, drawee, document_date, due_date, document_amount, amount, discount, interest_and_fines, barcode, guide_number, pix_qr_code_text, status, file_name, company_id, comments, created_at FROM boletos';
    const params: (string | null)[] = [];
    if (user.role !== 'admin') {
      query += ' WHERE company_id = ?';
      params.push(user.companyId);
    } else if (req.query.companyId) {
      query += ' WHERE company_id = ?';
      params.push(req.query.companyId as string);
    }
    query += ' ORDER BY created_at DESC';

    const [boletos] = await pool.query<RowDataPacket[]>(query, params);
    res.json(boletos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getBoletoById = async (req: AuthRequest, res: express.Response) => {
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

        res.json(boletos[0]);
    } catch (error) {
        console.error(`Error fetching boleto with ID ${boletoId}:`, error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const extractBoleto = async (req: AuthRequest, res: express.Response) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    const { method } = req.body;

    try {
        const [settingsRows] = await pool.query<RowDataPacket[]>("SELECT setting_value FROM settings WHERE setting_key = 'ai_settings'");
        const aiSettings = settingsRows.length > 0 ? JSON.parse(settingsRows[0].setting_value) : {};
        
        let extractedData;
        if (method === 'ai') {
            extractedData = await extractWithAI(req.file.buffer, req.file.originalname, 'pt', aiSettings);
        } else {
            extractedData = await extractWithRegex(req.file.buffer, req.file.originalname);
        }

        if (extractedData.amount === null || extractedData.amount === undefined) {
             return res.status(400).json({ message: 'amountNotFoundErrorText' });
        }

        res.status(200).json({ ...extractedData, fileData: req.file.buffer.toString('base64') });

    } catch (error: any) {
        console.error("Error extracting boleto data:", error);
        res.status(500).json({ message: error.message || 'Failed to process boleto' });
    }
};

export const saveBoleto = async (req: AuthRequest, res: express.Response) => {
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
        
        const { id, recipient, drawee, documentDate, dueDate, documentAmount, amount, discount, interestAndFines, barcode, guideNumber, pixQrCodeText, status, fileName, fileData, comments } = newBoleto;
        
        const finalDocumentDate = documentDate === 'null' ? null : documentDate;
        const finalDueDate = dueDate === 'null' ? null : dueDate;

        await connection.query(
            'INSERT INTO boletos (id, user_id, company_id, recipient, drawee, document_date, due_date, document_amount, amount, discount, interest_and_fines, barcode, guide_number, pix_qr_code_text, status, file_name, file_data, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, user.id, companyId, recipient, drawee, finalDocumentDate, finalDueDate, documentAmount, amount, discount, interestAndFines, barcode, guideNumber, pixQrCodeText, status, fileName, fileData, comments]
        );

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
        res.status(201).json(newBoleto);
    } catch (error: any) {
        await connection.rollback();
        console.error("Error saving boleto:", error);
        res.status(500).json({ message: error.message || 'Failed to save boleto' });
    } finally {
        connection.release();
    }
};

export const updateBoletoStatus = async (req: AuthRequest, res: express.Response) => {
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
        res.json(rows[0]);
    } catch (error) {
        await connection.rollback();
        console.error(`Error updating status for boleto ${id}:`, error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
};

export const updateBoletoComments = async (req: AuthRequest, res: express.Response) => {
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
        res.json(rows[0]);
    } catch (error) {
        await connection.rollback();
        console.error(`Error updating comments for boleto ${id}:`, error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
};

export const deleteBoleto = async (req: AuthRequest, res: express.Response) => {
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