
// FIX: Changed express import to directly include types for Request and Response, resolving type inference issues.
import express, { Request, Response } from 'express';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';

// FIX: Updated function signature to use directly imported express types.
export const getLogs = async (_req: Request, res: Response) => {
  try {
    const [logs] = await pool.query<RowDataPacket[]>('SELECT * FROM activity_logs ORDER BY timestamp DESC');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};