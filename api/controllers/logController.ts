// FIX: Import explicit types from express to avoid conflicts and resolve type errors.
import { Request, Response } from 'express';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';

// FIX: Use explicit Request and Response types.
export const getLogs = async (req: Request, res: Response) => {
  try {
    const [logs] = await pool.query<RowDataPacket[]>('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 200');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};