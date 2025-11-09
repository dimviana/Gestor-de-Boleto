import express from 'express';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';

// Ensure Express request handlers are correctly typed to resolve property access errors.
// FIX: Add Request and Response types to the handler.
export const getLogs = async (req: express.Request, res: express.Response) => {
  try {
    const [logs] = await pool.query<RowDataPacket[]>('SELECT * FROM activity_logs ORDER BY timestamp DESC');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};