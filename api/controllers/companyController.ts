// FIX: Aliased Request and Response types to avoid conflict with global DOM types.
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export const getCompanies = async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const [companies] = await pool.query<RowDataPacket[]>('SELECT * FROM companies ORDER BY name');
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCompany = async (req: ExpressRequest, res: ExpressResponse) => {
  const { name, cnpj, address } = req.body;
  const newCompany = { id: uuidv4(), name, cnpj, address };
  try {
    await pool.query('INSERT INTO companies SET ?', newCompany);
    res.status(201).json(newCompany);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateCompany = async (req: ExpressRequest, res: ExpressResponse) => {
  const { name, cnpj, address } = req.body;
  try {
    await pool.query('UPDATE companies SET name = ?, cnpj = ?, address = ? WHERE id = ?', [name, cnpj, address, req.params.id]);
    res.json({ message: 'Company updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteCompany = async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    // Note: The ON DELETE SET NULL constraint in the DB schema will handle un-assigning users.
    await pool.query('DELETE FROM companies WHERE id = ?', [req.params.id]);
    res.json({ message: 'Company deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};