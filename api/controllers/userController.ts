


import { Request, Response } from 'express';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Role } from '../../types';

// FIX: Correctly type Express request handler to resolve property access errors.
export const getUsers = async (req: Request, res: Response) => {
  try {
    const [usersFromDb] = await pool.query<RowDataPacket[]>('SELECT id, username, name, role, company_id FROM users');
    // Map snake_case from DB to camelCase for frontend consistency
    // Also, map old 'user' role to 'editor' for backward compatibility
    const users = usersFromDb.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role === 'user' ? 'editor' : user.role,
        companyId: user.company_id
    }));
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// FIX: Correctly type Express request handler to resolve property access errors.
export const createUser = async (req: Request, res: Response) => {
  const { username, password, name, role, companyId } = req.body;
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
    const newUserDb = { id: uuidv4(), username, name: name || null, password: hashedPassword, role, company_id: companyId || null };
    await connection.query('INSERT INTO users SET ?', newUserDb);
    
    await connection.query(
      'INSERT INTO activity_logs (id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
      [
        uuidv4(),
        adminUser.id,
        adminUser.username,
        'ADMIN_CREATE_USER',
        `Created new user '${name || username}' with role '${role}'.`
      ]
    );

    await connection.commit();
    
    // Prepare camelCase response for frontend
    const userResponse = {
        id: newUserDb.id,
        username: newUserDb.username,
        name: newUserDb.name,
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

// FIX: Correctly type Express request handler to resolve property access errors.
export const updateUser = async (req: Request, res: Response) => {
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
    if ('name' in req.body) updates.name = req.body.name;
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
    
    const details = `Updated user '${currentUser.name || currentUser.username}' (ID: ${userId}). Changes: ${Object.keys(updates).filter(k => k !== 'password').join(', ')}.`;
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

// FIX: Correctly type Express request handler to resolve property access errors.
export const deleteUser = async (req: Request, res: Response) => {
  const userIdToDelete = req.params.id;
  const adminUser = req.user!;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [users] = await connection.query<RowDataPacket[]>('SELECT username, name FROM users WHERE id = ?', [userIdToDelete]);
    if (users.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'User not found' });
    }
    const userToDelete = users[0];

    await connection.query('DELETE FROM users WHERE id = ?', [userIdToDelete]);

    await connection.query(
        'INSERT INTO activity_logs (id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
        [ uuidv4(), adminUser.id, adminUser.username, 'DELETE_USER', `Deleted user '${userToDelete.name || userToDelete.username}' (ID: ${userIdToDelete}).` ]
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

export const updateUserProfile = async (req: Request, res: Response) => {
    const user = req.user!;
    const { password } = req.body;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            await connection.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);

            await connection.query(
                'INSERT INTO activity_logs (id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
                [ uuidv4(), user.id, user.username, 'UPDATE_USER_PROFILE', 'User updated their own password.' ]
            );
        } else {
             await connection.rollback();
             return res.status(400).json({ message: 'No update information provided.' });
        }
        
        await connection.commit();
        res.json({ message: 'Profile updated successfully' });

    } catch (error) {
        await connection.rollback();
        console.error("Error updating user profile:", error);
        res.status(500).json({ message: 'Server error during profile update' });
    } finally {
        connection.release();
    }
};