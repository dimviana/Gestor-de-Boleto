import { Request, Response } from 'express';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const [users] = await pool.query<RowDataPacket[]>('SELECT id, username, role, company_id FROM users');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  const { username, password, role, companyId } = req.body;
  try {
    const [existingUsers] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'addUserErrorDuplicate' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = { id: uuidv4(), username, password: hashedPassword, role, company_id: companyId || null };
    await pool.query('INSERT INTO users SET ?', newUser);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userResponse } = newUser;
    res.status(201).json(userResponse);
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'addUserErrorDuplicate' });
    }
    console.error("Error creating user:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const { username, password, role, companyId } = req.body;
  try {
    let query = 'UPDATE users SET username = ?, role = ?, company_id = ?';
    const params: (string | null)[] = [username, role, companyId || null];

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(req.params.id);

    await pool.query(query, params);
    res.json({ message: 'User updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};