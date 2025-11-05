
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Role } from '../../types';

// FIX: Correctly type res parameter.
export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const [usersFromDb] = await pool.query<RowDataPacket[]>('SELECT id, username, role, company_id FROM users');
    // Map snake_case from DB to camelCase for frontend consistency
    // Also, map old 'user' role to 'editor' for backward compatibility
    const users = usersFromDb.map(user => ({
        id: user.id,
        username: user.username,
        role: user.role === 'user' ? 'editor' : user.role,
        companyId: user.company_id
    }));
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// FIX: Correctly type res parameter.
export const createUser = async (req: AuthRequest, res: Response) => {
  const { username, password, role, companyId } = req.body;
  const adminUser = req.user!;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existingUsers] = await connection.query<RowDataPacket[]>('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUsers.length > 0) {
      await connection.rollback();
      return res.status(409).json({ message: 'addUserErrorDuplicate' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Use snake_case for DB insertion
    const newUserDb = { id: uuidv4(), username, password: hashedPassword, role, company_id: companyId || null };
    await connection.query('INSERT INTO users SET ?', newUserDb);
    
    await connection.query(
      'INSERT INTO activity_logs (id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
      [
        uuidv4(),
        adminUser.id,
        adminUser.username,
        'ADMIN_CREATE_USER',
        `Created new user '${username}' with role '${role}'.`
      ]
    );

    await connection.commit();
    
    // Prepare camelCase response for frontend
    const userResponse = {
        id: newUserDb.id,
        username: newUserDb.username,
        role: newUserDb.role,
        companyId: newUserDb.company_id
    };
    
    res.status(201).json(userResponse);
  } catch (error: any) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'addUserErrorDuplicate' });
    }
    console.error("Error creating user:", error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

// FIX: Correctly type res parameter.
export const updateUser = async (req: AuthRequest, res: Response) => {
  const userId = req.params.id;
  const adminUser = req.user!;
  const { password } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [users] = await connection.query<RowDataPacket[]>('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'User not found' });
    }
    const currentUser = users[0];

    const updates: any = {};
    if ('username' in req.body) updates.username = req.body.username;
    if ('role' in req.body) updates.role = req.body.role;
    if ('companyId' in req.body) updates.company_id = req.body.companyId || null;

    if (password) {
        const salt = await bcrypt.genSalt(10);
        updates.password = await bcrypt.hash(password, salt);
    }
    
    if (Object.keys(updates).length === 0) {
        await connection.rollback();
        return res.json({ message: 'No changes provided to update.' });
    }
    
    await connection.query('UPDATE users SET ? WHERE id = ?', [updates, userId]);
    
    const details = `Updated user '${currentUser.username}' (ID: ${userId}). Changes: ${Object.keys(updates).filter(k => k !== 'password').join(', ')}.`;
    await connection.query(
        'INSERT INTO activity_logs (id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
        [ uuidv4(), adminUser.id, adminUser.username, 'ADMIN_UPDATE_USER', details ]
    );

    await connection.commit();
    res.json({ message: 'User updated successfully' });

  } catch (error) {
    await connection.rollback();
    console.error("Error updating user:", error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

// FIX: Correctly type res parameter.
export const deleteUser = async (req: AuthRequest, res: Response) => {
  const userIdToDelete = req.params.id;
  const adminUser = req.user!;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [users] = await connection.query<RowDataPacket[]>('SELECT username FROM users WHERE id = ?', [userIdToDelete]);
    if (users.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'User not found' });
    }
    const usernameToDelete = users[0].username;

    await connection.query('DELETE FROM users WHERE id = ?', [userIdToDelete]);

    await connection.query(
        'INSERT INTO activity_logs (id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
        [ uuidv4(), adminUser.id, adminUser.username, 'DELETE_USER', `Deleted user '${usernameToDelete}' (ID: ${userIdToDelete}).` ]
    );

    await connection.commit();
    res.json({ message: 'User deleted' });
  } catch (error) {
    await connection.rollback();
    console.error("Error deleting user:", error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};