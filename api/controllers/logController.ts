
import express from 'express';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';

// Ensure Express request handlers are correctly typed to resolve property access errors.
// FIX: Add RequestHandler type to the handler.
export const getLogs: express.RequestHandler = async (req, res) => {
  try {
    const [logs] = await pool.query<RowDataPacket[]>('SELECT * FROM activity_logs ORDER BY timestamp DESC');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};