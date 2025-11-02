
// FIX: Use standard express Request and Response types.
import { Request, Response } from 'express';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';

export const getLogs = async (req: Request, res: Response) => {
  try {
    const [logs] = await pool.query<RowDataPacket[]>('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 200');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};