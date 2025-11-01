// FIX: Changed to use namespace import to avoid conflicts with global DOM types.
// FIX: Changed express import to a namespace import to resolve type conflicts with DOM types.
import * as express from 'express';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';

// FIX: Added explicit express types to request and response objects.
export const getLogs = async (req: express.Request, res: express.Response) => {
  try {
    const [logs] = await pool.query<RowDataPacket[]>('SELECT * FROM activity_logs ORDER BY timestamp DESC');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};