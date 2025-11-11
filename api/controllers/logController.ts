


import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';

// Add explicit types for Express Request and Response objects.
// FIX: Use aliased Express Request and Response types to avoid global type conflicts.
export const getLogs = async (_req: ExpressRequest, res: ExpressResponse) => {
  try {
    const [logs] = await pool.query<RowDataPacket[]>('SELECT * FROM activity_logs ORDER BY timestamp DESC');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};