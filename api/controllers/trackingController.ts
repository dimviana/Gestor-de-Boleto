
// FIX: Use default express import and qualified types to avoid type conflicts.
import { Request, Response } from 'express';
import { pool } from '../../config/db';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket } from 'mysql2';
import { appConfig } from '../services/configService';

// FIX: Use express.Request, express.Response to get correct typings.
export const logTracking = async (req: Request, res: Response) => {
    const user = req.user!;
    const { latitude, longitude } = req.body;
    // req.ip will contain the real user IP because of `app.set('trust proxy', true)`
    const ipAddress = req.ip;

    try {
        await pool.query(
            'INSERT INTO tracking_logs (id, user_id, username, ip_address, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)',
            [uuidv4(), user.id, user.username, ipAddress, latitude || null, longitude || null]
        );

        // Simulate email sending if enabled in settings
        if (appConfig.tracking_notification_enabled && appConfig.tracking_notification_email) {
            console.log(`[Tracking Email Simulation]
                Login detected for user: ${user.username}
                IP Address: ${ipAddress}
                Location: lat=${latitude}, lon=${longitude}
                WOULD SEND NOTIFICATION TO: ${appConfig.tracking_notification_email}
            `);
        }
        
        res.status(200).json({ message: 'Tracking info logged.' });
    } catch (error) {
        console.error('Error logging tracking info:', error);
        res.status(500).json({ message: 'Server error while logging tracking info' });
    }
};

// FIX: Use express.Request, express.Response to get correct typings.
export const getTrackingLogs = async (_req: Request, res: Response) => {
    try {
        const [logs] = await pool.query<RowDataPacket[]>('SELECT * FROM tracking_logs ORDER BY timestamp DESC LIMIT 500');
        
        const mappedLogs = logs.map(log => ({
            id: log.id,
            userId: log.user_id,
            username: log.username,
            ipAddress: log.ip_address,
            latitude: log.latitude,
            longitude: log.longitude,
            timestamp: log.timestamp
        }));

        res.json(mappedLogs);
    } catch (error) {
        console.error('Error fetching tracking logs:', error);
        res.status(500).json({ message: 'Server error while fetching tracking logs' });
    }
};