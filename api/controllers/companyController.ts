import { Request, Response } from 'express';
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

// FIX: Correctly type Express request handlers to resolve property access and overload errors.
export const getCompanies = async (req: Request, res: Response) => {
  try {
    const [companies] = await pool.query<RowDataPacket[]>('SELECT id, name, cnpj, address, monitored_folder_path FROM companies ORDER BY name');
    // FIX: Correctly type Express request handlers to resolve property access and overload errors.
    res.json(companies.map(mapDbCompanyToCompany));
  } catch (error) {
    console.error("Error fetching companies:", error);
    // FIX: Correctly type Express request handlers to resolve property access and overload errors.
    res.status(500).json({ message: 'Server error' });
  }
};

// FIX: Correctly type Express request handlers to resolve property access and overload errors.
export const createCompany = async (req: Request, res: Response) => {
  // FIX: Correctly type Express request handlers to resolve property access and overload errors.
  const { name, cnpj, address } = req.body;
  // FIX: Correctly type Express request handlers to resolve property access and overload errors.
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
    // FIX: Correctly type Express request handlers to resolve property access and overload errors.
    res.status(201).json(newCompany);
  } catch (error) {
    await connection.rollback();
    console.error("Error creating company:", error);
    // FIX: Correctly type Express request handlers to resolve property access and overload errors.
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

// FIX: Correctly type Express request handlers to resolve property access and overload errors.
export const updateCompany = async (req: Request, res: Response) => {
  // FIX: Correctly type Express request handlers to resolve property access and overload errors.
  const { name, cnpj, address } = req.body;
  // FIX: Correctly type Express request handlers to resolve property access and overload errors.
  const user = req.user!;
  // FIX: Correctly type Express request handlers to resolve property access and overload errors.
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
    // FIX: Correctly type Express request handlers to resolve property access and overload errors.
    res.json({ message: 'Company updated' });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating company:", error);
    // FIX: Correctly type Express request handlers to resolve property access and overload errors.
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

// FIX: Correctly type Express request handlers to resolve property access and overload errors.
export const deleteCompany = async (req: Request, res: Response) => {
  // FIX: Correctly type Express request handlers to resolve property access and overload errors.
  const user = req.user!;
  // FIX: Correctly type Express request handlers to resolve property access and overload errors.
  const companyId = req.params.id;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [companyBeforeRows] = await connection.query<RowDataPacket[]>('SELECT name FROM companies WHERE id = ?', [companyId]);
    if (companyBeforeRows.length === 0) {
        await connection.rollback();
        // FIX: Correctly type Express request handlers to resolve property access and overload errors.
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
    // FIX: Correctly type Express request handlers to resolve property access and overload errors.
    res.json({ message: 'Company deleted' });
  } catch (error) {
    await connection.rollback();
    console.error("Error deleting company:", error);
    // FIX: Correctly type Express request handlers to resolve property access and overload errors.
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

// FIX: Correctly type Express request handlers to resolve property access and overload errors.
export const setMonitoredFolderPath = async (req: Request, res: Response) => {
  // FIX: Correctly type Express request handlers to resolve property access and overload errors.
  const { path } = req.body;
  // FIX: Correctly type Express request handlers to resolve property access and overload errors.
  const { id } = req.params;
  
  if (!path) {
    // FIX: Correctly type Express request handlers to resolve property access and overload errors.
    return res.status(400).json({ message: "Path is required" });
  }

  try {
    await pool.query('UPDATE companies SET monitored_folder_path = ? WHERE id = ?', [path, id]);
    // FIX: Correctly type Express request handlers to resolve property access and overload errors.
    res.json({ message: 'Monitored folder path updated.' });
  } catch (error) {
    console.error("Error setting monitored folder path:", error);
    // FIX: Correctly type Express request handlers to resolve property access and overload errors.
    res.status(500).json({ message: 'Server error' });
  }
};

// FIX: Correctly type Express request handlers to resolve property access and overload errors.
export const clearMonitoredFolderPath = async (req: Request, res: Response) => {
  // FIX: Correctly type Express request handlers to resolve property access and overload errors.
  const { id } = req.params;

  try {
    await pool.query('UPDATE companies SET monitored_folder_path = NULL WHERE id = ?', [id]);
    // FIX: Correctly type Express request handlers to resolve property access and overload errors.
    res.json({ message: 'Monitored folder path cleared.' });
  } catch (error) {
    console.error("Error clearing monitored folder path:", error);
    // FIX: Correctly type Express request handlers to resolve property access and overload errors.
    res.status(500).json({ message: 'Server error' });
  }
};
