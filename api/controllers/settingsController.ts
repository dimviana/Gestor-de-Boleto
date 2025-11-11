

import express from 'express';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';
import { updateInMemoryConfig } from '../services/configService';

export const getSettings = async (req: express.Request, res: express.Response) => {
  try {
    const [settings] = await pool.query<RowDataPacket[]>('SELECT * FROM settings');
    const settingsObj = settings.reduce((acc, setting) => {
        try {
            // Attempt to parse JSON strings
            acc[setting.setting_key] = JSON.parse(setting.setting_value);
        } catch (e) {
            // Otherwise, use the raw value
            acc[setting.setting_key] = setting.setting_value;
        }
        return acc;
    }, {} as Record<string, any>);
    res.json(settingsObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateSettings = async (req: express.Request, res: express.Response) => {
    const settings: Record<string, any> = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        for (const key in settings) {
            const value = typeof settings[key] === 'object' ? JSON.stringify(settings[key]) : settings[key];
            await connection.query(
                'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                [key, value, value]
            );
            // Update in-memory config immediately
            updateInMemoryConfig(key, settings[key]);
        }
        await connection.commit();
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: 'Failed to update settings' });
    } finally {
        connection.release();
    }
};