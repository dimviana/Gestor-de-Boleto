
// FIX: Use express types directly to avoid conflicts.
import { Response as ExpressResponse } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../../config/db';
import { Boleto, BoletoStatus, AiSettings } from '../../types';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { extractBoletoInfo } from '../services/geminiService';

export const getBoletos = async (req: AuthRequest, res: ExpressResponse) => {
  const user = req.user!;
  try {
    let query = 'SELECT * FROM boletos';
    const params: string[] = [];
    if (user.role !== 'admin') {
      query += ' WHERE company_id = ?';
      params.push(user.companyId!);
    } else if (req.query.companyId) {
      // Admin can filter by company
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

export const createBoleto = async (req: AuthRequest, res: ExpressResponse) => {
    const user = req.user!;
    if (!user.companyId) {
        return res.status(400).json({ message: 'User is not associated with a company' });
    }
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        const [settingsRows] = await pool.query<RowDataPacket[]>("SELECT setting_value FROM settings WHERE setting_key = 'ai_settings'");
        const aiSettings: AiSettings = settingsRows.length > 0 ? JSON.parse(settingsRows[0].setting_value) : {};

        const extractedData = await extractBoletoInfo(req.file.buffer, req.file.originalname, 'pt', aiSettings);

        if (extractedData.barcode) {
             const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM boletos WHERE barcode = ? AND company_id = ?', [extractedData.barcode, user.companyId]);
             if (existing.length > 0) {
                 return res.status(409).json({ message: `Duplicate barcode for document: ${extractedData.guideNumber || extractedData.recipient}`});
             }
        }
       
        const newBoleto: Boleto = {
            id: uuidv4(),
            ...extractedData,
            status: BoletoStatus.TO_PAY,
            fileData: req.file.buffer.toString('base64'),
            comments: null,
            companyId: user.companyId,
        };
        
        const { id, recipient, drawee, documentDate, dueDate, amount, discount, interestAndFines, barcode, guideNumber, pixQrCodeText, status, fileName, fileData, comments, companyId } = newBoleto;

        await pool.query(
            'INSERT INTO boletos (id, user_id, company_id, recipient, drawee, document_date, due_date, amount, discount, interest_and_fines, barcode, guide_number, pix_qr_code_text, status, file_name, file_data, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, user.id, companyId, recipient, drawee, documentDate, dueDate, amount, discount, interestAndFines, barcode, guideNumber, pixQrCodeText, status, fileName, fileData, comments]
        );

        res.status(201).json(newBoleto);

    } catch (error) {
        console.error("Error creating boleto:", error);
        res.status(500).json({ message: 'Failed to process boleto' });
    }
};

export const updateBoletoStatus = async (req: AuthRequest, res: ExpressResponse) => {
    const { status } = req.body;
    try {
        await pool.query('UPDATE boletos SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ message: 'Status updated' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateBoletoComments = async (req: AuthRequest, res: ExpressResponse) => {
    const { comments } = req.body;
    try {
        await pool.query('UPDATE boletos SET comments = ? WHERE id = ?', [comments, req.params.id]);
        res.json({ message: 'Comments updated' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteBoleto = async (req: AuthRequest, res: ExpressResponse) => {
    try {
        await pool.query('DELETE FROM boletos WHERE id = ?', [req.params.id]);
        res.json({ message: 'Boleto deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};