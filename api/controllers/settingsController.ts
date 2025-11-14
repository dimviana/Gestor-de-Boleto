

// FIX: Changed express import to directly include types for Request and Response, resolving type inference issues.
import express, { Request, Response } from 'express';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';
import { updateInMemoryConfig } from '../services/configService';

// FIX: Updated function signature to use directly imported express types.
export const getSettings = async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    const [settings] = await pool.query<RowDataPacket[]>("SELECT setting_key, setting_value FROM settings");
    const settingsObj = settings.reduce((acc, setting) => {
        try {
            if (typeof setting.setting_value === 'string' && (setting.setting_value.startsWith('{') || setting.setting_value.startsWith('['))) {
                acc[setting.setting_key] = JSON.parse(setting.setting_value);
            } else {
                acc[setting.setting_key] = setting.setting_value;
            }
        } catch (e) {
            acc[setting.setting_key] = setting.setting_value;
        }
        return acc;
    }, {} as Record<string, any>);
    
    if (user.role === 'admin') {
        return res.json(settingsObj);
    } 
    
    if (user.role === 'company_admin') {
        const allowedSettings: Record<string, any> = {};
        if (settingsObj.hasOwnProperty('pagination_cardsPerPage')) {
            allowedSettings.pagination_cardsPerPage = settingsObj.pagination_cardsPerPage;
        }
        return res.json(allowedSettings);
    }
    
    return res.status(403).json({ message: 'Permission denied' });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Server error while fetching settings' });
  }
};

// FIX: Updated function signature to use directly imported express types.
export const updateSettings = async (req: Request, res: Response) => {
    const user = req.user!;
    const settingsToUpdate: Record<string, any> = req.body;
    
    if (user.role === 'company_admin') {
        const allowedKeys = ['pagination_cardsPerPage'];
        const receivedKeys = Object.keys(settingsToUpdate);
        
        for (const key of receivedKeys) {
            if (!allowedKeys.includes(key)) {
                return res.status(403).json({ message: `Permission denied to update setting: ${key}` });
            }
        }
    }
    
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        for (const key in settingsToUpdate) {
            const value = settingsToUpdate[key];
            const dbValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

            await connection.query(
                'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                [key, dbValue, dbValue]
            );
            updateInMemoryConfig(key, value);
        }
        await connection.commit();
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        await connection.rollback();
        console.error("Error updating settings:", error);
        res.status(500).json({ message: 'Failed to update settings' });
    } finally {
        connection.release();
    }
};