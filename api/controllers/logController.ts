


// FIX: Corrected Express types for controller function parameters.
import { RequestHandler } from 'express';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';

// FIX: Corrected Express types for controller function parameters.
export const getLogs: RequestHandler = async (req, res) => {
  try {
    const [logs] = await pool.query<RowDataPacket[]>('SELECT * FROM activity_logs ORDER BY timestamp DESC');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};