// Fix: Import express type to use fully qualified types and avoid conflicts.
import { Request, Response } from 'express';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';

// Fix: Use express.Request and express.Response
export const getLogs = async (req: Request, res: Response) => {
  try {
    const [logs] = await pool.query<RowDataPacket[]>('SELECT * FROM activity_logs ORDER BY timestamp DESC');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};