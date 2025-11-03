


// FIX: Alias express Response to avoid conflict with global DOM types
import { Response as ExpressResponse } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';

export const getLogs = async (req: AuthRequest, res: ExpressResponse) => {
  try {
    const [logs] = await pool.query<RowDataPacket[]>('SELECT * FROM activity_logs ORDER BY timestamp DESC');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};