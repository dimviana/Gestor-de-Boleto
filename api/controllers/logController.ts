
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';

// FIX: Correctly type res parameter.
export const getLogs = async (req: AuthRequest, res: Response) => {
  try {
    const [logs] = await pool.query<RowDataPacket[]>('SELECT * FROM activity_logs ORDER BY timestamp DESC');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};