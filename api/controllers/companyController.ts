


import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { Company } from '../../types';


const mapDbCompanyToCompany = (dbCompany: any): Company => ({
    id: dbCompany.id,
    name: dbCompany.name,
    cnpj: dbCompany.cnpj,
    address: dbCompany.address,
    monitoredFolderPath: dbCompany.monitored_folder_path
});

// Add explicit types for Express Request and Response objects.
// FIX: Use aliased Express Request and Response types to avoid global type conflicts.
export const getCompanies = async (_req: ExpressRequest, res: ExpressResponse) => {
  try {
    const [companies] = await pool.query<RowDataPacket[]>('SELECT id, name, cnpj, address, monitored_folder_path FROM companies ORDER BY name');
    res.json(companies.map(mapDbCompanyToCompany));
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add explicit types for Express Request and Response objects.
// FIX: Use aliased Express Request and Response types to avoid global type conflicts.
export const createCompany = async (req: ExpressRequest, res: ExpressResponse) => {
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

// Add explicit types for Express Request and Response objects.
// FIX: Use aliased Express Request and Response types to avoid global type conflicts.
export const updateCompany = async (req: ExpressRequest, res: ExpressResponse) => {
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

// Add explicit types for Express Request and Response objects.
// FIX: Use aliased Express Request and Response types to avoid global type conflicts.
export const deleteCompany = async (req: ExpressRequest, res: ExpressResponse) => {
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

// Add explicit types for Express Request and Response objects.
// FIX: Use aliased Express Request and Response types to avoid global type conflicts.
export const setMonitoredFolderPath = async (req: ExpressRequest, res: ExpressResponse) => {
  const { path } = req.body;
  const { id } = req.params;
  
  if (!path) {
    return res.status(400).json({ message: "Path is required" });
  }

  try {
    await pool.query('UPDATE companies SET monitored_folder_path = ? WHERE id = ?', [path, id]);
    res.json({ message: 'Monitored folder path updated.' });
  } catch (error) {
    console.error("Error setting monitored folder path:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add explicit types for Express Request and Response objects.
// FIX: Use aliased Express Request and Response types to avoid global type conflicts.
export const clearMonitoredFolderPath = async (req: ExpressRequest, res: ExpressResponse) => {
  const { id } = req.params;

  try {
    await pool.query('UPDATE companies SET monitored_folder_path = NULL WHERE id = ?', [id]);
    res.json({ message: 'Monitored folder path cleared.' });
  } catch (error) {
    console.error("Error clearing monitored folder path:", error);
    res.status(500).json({ message: 'Server error' });
  }
};