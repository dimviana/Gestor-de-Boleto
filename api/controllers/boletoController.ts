
import express from 'express';
import { pool } from '../../config/db';
import { Boleto, BoletoStatus } from '../../types';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import { Buffer } from 'buffer';

const extractBoletoWithPython = (pdfBuffer: Buffer): Promise<any> => {
    return new Promise((resolve, reject) => {
        const pythonExecutable = process.env.PYTHON_PATH || 'python3';
        const scriptPath = 'api/services/parser.txt';
        const pythonProcess = spawn(pythonExecutable, [scriptPath]);

        let stdoutData = '';
        let stderrData = '';

        pythonProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python script exited with code ${code}`);
                console.error('Python stderr:', stderrData);
                return reject(new Error('Falha ao processar o PDF com o script Python. Verifique os logs do servidor.'));
            }
            try {
                const result = JSON.parse(stdoutData);
                resolve(result);
            } catch (e) {
                console.error('Failed to parse JSON from Python script:', stdoutData);
                reject(new Error('Resposta inválida do script de processamento Python.'));
            }
        });
        
        pythonProcess.on('error', (err) => {
            console.error('Failed to start Python process:', err);
            reject(new Error('Não foi possível iniciar o serviço de processamento de PDF. Verifique se o Python está instalado no servidor.'));
        });

        pythonProcess.stdin.write(pdfBuffer);
        pythonProcess.stdin.end();
    });
};

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
        const extractedData = await extractBoletoWithPython(req.file.buffer);
        extractedData.fileName = req.file.originalname;

        if (extractedData.amount === null || extractedData.amount === undefined) {
             return res.status(400).json({ message: 'amountNotFoundErrorText' });
        }

        res.status(200).json({ ...extractedData, fileData: req.file.buffer.toString('base64') });
    } catch (error: any) {
        console.error("Error extracting boleto data:", error);
        res.status(500).json({ message: error.message || 'Failed to process boleto' });
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
        
        const columns = [
            'id', 'user_id', 'company_id', 'recipient', 'drawee', 
            'document_date', 'due_date', 'document_amount', 'amount', 
            'discount', 'interest_and_fines', 'barcode', 'guide_number', 
            'pix_qr_code_text', 'status', 'file_name', 'file_data', 'comments'
        ];

        const values = [
            newBoleto.id, user.id, newBoleto.companyId, newBoleto.recipient,
            newBoleto.drawee, newBoleto.documentDate === 'null' ? null : newBoleto.documentDate,
            newBoleto.dueDate === 'null' ? null : newBoleto.dueDate, newBoleto.documentAmount,
            newBoleto.amount, newBoleto.discount, newBoleto.interestAndFines,
            newBoleto.barcode, newBoleto.guideNumber, newBoleto.pixQrCodeText,
            newBoleto.status, newBoleto.fileName, newBoleto.fileData, newBoleto.comments
        ];

        const sql = `INSERT INTO boletos (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
        
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
