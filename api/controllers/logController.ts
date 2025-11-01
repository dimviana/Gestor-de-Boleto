
// FIX: Use express types directly to avoid conflicts.
import express from 'express';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';

export const getLogs = async (req: express.Request, res: express.Response) => {
  try {
    const [logs] = await pool.query<RowDataPacket[]>('SELECT * FROM activity_logs ORDER BY timestamp DESC');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};