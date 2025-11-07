
// Use RequestHandler to correctly type Express handlers
import { RequestHandler } from 'express';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';

// Use RequestHandler type for Express route handlers
export const getLogs: RequestHandler = async (req, res) => {
  try {
    const [logs] = await pool.query<RowDataPacket[]>('SELECT * FROM activity_logs ORDER BY timestamp DESC');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
