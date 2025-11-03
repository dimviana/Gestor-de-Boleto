// FIX: Import explicit Response type from express.
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../../config/db';
import { Boleto, BoletoStatus, AiSettings } from '../../types';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { extractBoletoInfo } from '../services/geminiService';

// FIX: Use explicit Response type for route handlers.
export const getBoletos = async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  try {
    // If a non-admin user is not associated with a company, they cannot have any boletos.
    // Return an empty array to prevent errors and unnecessary database queries.
    if (user.role !== 'admin' && !user.companyId) {
      return res.json([]);
    }

    let query = 'SELECT * FROM boletos';
    const params: (string | null)[] = [];
    if (user.role !== 'admin') {
      // This is now safe because we've already checked for user.companyId existence.
      query += ' WHERE company_id = ?';
      params.push(user.companyId);
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

// FIX: Use explicit Response type for route handlers.
export const createBoleto = async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const adminSelectedCompanyId = req.body.companyId;

    let targetCompanyId: string | null;

    if (user.role === 'admin') {
        if (!adminSelectedCompanyId) {
            return res.status(400).json({ message: 'Admin must select a company to upload a boleto.' });
        }
        targetCompanyId = adminSelectedCompanyId;
    } else {
        if (!user.companyId) {
            return res.status(400).json({ message: 'User is not associated with a company' });
        }
        targetCompanyId = user.companyId;
    }


    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    // This check is moved before the try...catch block to satisfy TypeScript's control flow analysis.
    // After this check, TypeScript knows `targetCompanyId` can no longer be null.
    if (!targetCompanyId) {
        return res.status(500).json({ message: 'Internal Server Error: Target company ID was not determined.' });
    }

    try {
        const [settingsRows] = await pool.query<RowDataPacket[]>("SELECT setting_value FROM settings WHERE setting_key = 'ai_settings'");
        const aiSettings: AiSettings = settingsRows.length > 0 ? JSON.parse(settingsRows[0].setting_value) : {};

        const extractedData = await extractBoletoInfo(req.file.buffer, req.file.originalname, 'pt', aiSettings);

        if (extractedData.barcode) {
             const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM boletos WHERE barcode = ? AND company_id = ?', [extractedData.barcode, targetCompanyId]);
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
            companyId: targetCompanyId, // This assignment is now type-safe
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

// FIX: Use explicit Response type for route handlers.
export const updateBoletoStatus = async (req: AuthRequest, res: Response) => {
    const { status } = req.body;
    try {
        await pool.query('UPDATE boletos SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ message: 'Status updated' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// FIX: Use explicit Response type for route handlers.
export const updateBoletoComments = async (req: AuthRequest, res: Response) => {
    const { comments } = req.body;
    try {
        await pool.query('UPDATE boletos SET comments = ? WHERE id = ?', [comments, req.params.id]);
        res.json({ message: 'Comments updated' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// FIX: Use explicit Response type for route handlers.
export const deleteBoleto = async (req: AuthRequest, res: Response) => {
    try {
        await pool.query('DELETE FROM boletos WHERE id = ?', [req.params.id]);
        res.json({ message: 'Boleto deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};