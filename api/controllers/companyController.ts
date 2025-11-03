

// FIX: Use named import for Response to avoid type conflicts with global DOM types
import express from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export const getCompanies = async (req: AuthRequest, res: express.Response) => {
  try {
    const [companies] = await pool.query<RowDataPacket[]>('SELECT * FROM companies ORDER BY name');
    res.json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCompany = async (req: AuthRequest, res: express.Response) => {
  const { name, cnpj, address } = req.body;
  const user = req.user!;
  const newCompany = { id: uuidv4(), name, cnpj, address };
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query('INSERT INTO companies SET ?', newCompany);

    await connection.query(
      'INSERT INTO activity_logs (id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
      [
        uuidv4(),
        user.id,
        user.username,
        'ADMIN_CREATE_COMPANY',
        `Created company '${name}' (ID: ${newCompany.id}).`
      ]
    );

    await connection.commit();
    res.status(201).json(newCompany);
  } catch (error) {
    await connection.rollback();
    console.error("Error creating company:", error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

export const updateCompany = async (req: AuthRequest, res: express.Response) => {
  const { name, cnpj, address } = req.body;
  const user = req.user!;
  const companyId = req.params.id;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [companyBeforeRows] = await connection.query<RowDataPacket[]>('SELECT name FROM companies WHERE id = ?', [companyId]);
    const oldName = companyBeforeRows.length > 0 ? companyBeforeRows[0].name : 'N/A';

    await connection.query('UPDATE companies SET name = ?, cnpj = ?, address = ? WHERE id = ?', [name, cnpj, address, companyId]);
    
    await connection.query(
        'INSERT INTO activity_logs (id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
        [
          uuidv4(),
          user.id,
          user.username,
          'ADMIN_UPDATE_COMPANY',
          `Updated company '${oldName}' (ID: ${companyId}) to new name '${name}'.`
        ]
    );
    
    await connection.commit();
    res.json({ message: 'Company updated' });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating company:", error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

export const deleteCompany = async (req: AuthRequest, res: express.Response) => {
  const user = req.user!;
  const companyId = req.params.id;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [companyBeforeRows] = await connection.query<RowDataPacket[]>('SELECT name FROM companies WHERE id = ?', [companyId]);
    if (companyBeforeRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Company not found' });
    }
    const companyName = companyBeforeRows[0].name;

    // The ON DELETE SET NULL constraint in the DB schema will handle un-assigning users.
    await connection.query('DELETE FROM companies WHERE id = ?', [companyId]);
    
    await connection.query(
        'INSERT INTO activity_logs (id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
        [
          uuidv4(),
          user.id,
          user.username,
          'ADMIN_DELETE_COMPANY',
          `Deleted company '${companyName}' (ID: ${companyId}).`
        ]
    );

    await connection.commit();
    res.json({ message: 'Company deleted' });
  } catch (error) {
    await connection.rollback();
    console.error("Error deleting company:", error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};