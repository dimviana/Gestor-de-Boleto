// FIX: Import explicit types from express to avoid conflicts and resolve type errors.
import { Request, Response } from 'express';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

// FIX: Use explicit Request and Response types.
export const getCompanies = async (req: Request, res: Response) => {
  try {
    const [companies] = await pool.query<RowDataPacket[]>('SELECT * FROM companies ORDER BY name');
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// FIX: Use explicit Request and Response types.
export const createCompany = async (req: Request, res: Response) => {
  const { name, cnpj, address } = req.body;
  const newCompany = { id: uuidv4(), name, cnpj, address };
  try {
    await pool.query('INSERT INTO companies SET ?', newCompany);
    res.status(201).json(newCompany);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// FIX: Use explicit Request and Response types.
export const updateCompany = async (req: Request, res: Response) => {
  const { name, cnpj, address } = req.body;
  try {
    await pool.query('UPDATE companies SET name = ?, cnpj = ?, address = ? WHERE id = ?', [name, cnpj, address, req.params.id]);
    res.json({ message: 'Company updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// FIX: Use explicit Request and Response types.
export const deleteCompany = async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM companies WHERE id = ?', [req.params.id]);
    res.json({ message: 'Company deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};