import { Request, Response } from 'express';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';

// FIX: Correctly type Express request handlers to resolve property access and overload errors.
export const getLogs = async (req: Request, res: Response) => {
  try {
    const [logs] = await pool.query<RowDataPacket[]>('SELECT * FROM activity_logs ORDER BY timestamp DESC');
    // FIX: Correctly type Express request handlers to resolve property access and overload errors.
    res.json(logs);
  } catch (error) {
    // FIX: Correctly type Express request handlers to resolve property access and overload errors.
    res.status(500).json({ message: 'Server error' });
  }
};
