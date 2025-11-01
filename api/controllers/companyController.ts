
// FIX: Use express types directly to avoid conflicts.
import express from 'express';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export const getCompanies = async (req: express.Request, res: express.Response) => {
  try {
    const [companies] = await pool.query<RowDataPacket[]>('SELECT * FROM companies ORDER BY name');
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCompany = async (req: express.Request, res: express.Response) => {
  const { name, cnpj, address } = req.body;
  const newCompany = { id: uuidv4(), name, cnpj, address };
  try {
    await pool.query('INSERT INTO companies SET ?', newCompany);
    res.status(201).json(newCompany);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateCompany = async (req: express.Request, res: express.Response) => {
  const { name, cnpj, address } = req.body;
  try {
    await pool.query('UPDATE companies SET name = ?, cnpj = ?, address = ? WHERE id = ?', [name, cnpj, address, req.params.id]);
    res.json({ message: 'Company updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteCompany = async (req: express.Request, res: express.Response) => {
  try {
    // Note: The ON DELETE SET NULL constraint in the DB schema will handle un-assigning users.
    await pool.query('DELETE FROM companies WHERE id = ?', [req.params.id]);
    res.json({ message: 'Company deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};