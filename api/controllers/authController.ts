// FIX: Use named imports for express types to avoid conflicts with global DOM types
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { appConfig } from '../services/configService';

const generateToken = (id: string, username: string, role: string, company_id: string | null) => {
  if (!appConfig.JWT_SECRET || appConfig.JWT_SECRET === 'default_jwt_secret_please_change') {
    console.error('CRITICAL: JWT_SECRET is not configured. Cannot generate token. Please set it in the admin panel or .env file.');
    throw new Error('Server authentication is not properly configured.');
  }
  return jwt.sign({ id, username, role, companyId: company_id }, appConfig.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// FIX: Use imported express types for request and response.
export const registerUser = async (req: Request, res: Response) => {
  const { username, password, role = 'user', companyId = null } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Please provide username and password' });
  }

  try {
    const [existingUsers] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userId = uuidv4();

    await pool.query('INSERT INTO users (id, username, password, role, company_id) VALUES (?, ?, ?, ?, ?)', [userId, username, hashedPassword, role, companyId]);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// FIX: Use imported express types for request and response.
export const loginUser = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Please provide username and password' });
  }

  try {
    const [users] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE username = ?', [username]);

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      companyId: user.company_id,
      token: generateToken(user.id, user.username, user.role, user.company_id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login' });
  }
};