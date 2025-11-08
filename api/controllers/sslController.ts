import { Request, Response } from 'express';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';
import { exec } from 'child_process';
import { SslStatus } from '../../types';

const SSL_SETTINGS_KEY = 'ssl_settings';

// FIX: Correctly type Express request handlers to resolve property access and overload errors.
export const getSslSettings = async (req: Request, res: Response) => {
    try {
        const [rows] = await pool.query<RowDataPacket[]>("SELECT setting_value FROM settings WHERE setting_key = ?", [SSL_SETTINGS_KEY]);
        if (rows.length > 0) {
            // FIX: Correctly type Express request handlers to resolve property access and overload errors.
            res.json(JSON.parse(rows[0].setting_value));
        } else {
            // FIX: Correctly type Express request handlers to resolve property access and overload errors.
            res.json({ domain: '' });
        }
    } catch (error) {
        console.error('Error fetching SSL settings:', error);
        // FIX: Correctly type Express request handlers to resolve property access and overload errors.
        res.status(500).json({ message: 'Server error' });
    }
};

// FIX: Correctly type Express request handlers to resolve property access and overload errors.
export const saveSslSettings = async (req: Request, res: Response) => {
    // FIX: Correctly type Express request handlers to resolve property access and overload errors.
    const { domain } = req.body;
    if (typeof domain !== 'string') {
        // FIX: Correctly type Express request handlers to resolve property access and overload errors.
        return res.status(400).json({ message: 'Invalid domain specified.' });
    }
    const settingsValue = JSON.stringify({ domain });

    try {
        await pool.query(
            'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            [SSL_SETTINGS_KEY, settingsValue, settingsValue]
        );
        // FIX: Correctly type Express request handlers to resolve property access and overload errors.
        res.status(200).json({ message: 'SSL settings saved successfully.' });
    } catch (error) {
        console.error('Error saving SSL settings:', error);
        // FIX: Correctly type Express request handlers to resolve property access and overload errors.
        res.status(500).json({ message: 'Server error' });
    }
};

// FIX: Correctly type Express request handlers to resolve property access and overload errors.
export const checkSslStatus = (req: Request, res: Response) => {
    // FIX: Correctly type Express request handlers to resolve property access and overload errors.
    const { domain } = req.body;
    if (!domain) {
        // FIX: Correctly type Express request handlers to resolve property access and overload errors.
        return res.status(400).json({ message: 'Domain is required.' });
    }

    // This command connects to the server and pipes the certificate to openssl to extract dates.
    const command = `echo | openssl s_client -servername ${domain} -connect ${domain}:443 2>/dev/null | openssl x509 -noout -dates`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`SSL check exec error for domain ${domain}:`, stderr);
            // FIX: Correctly type Express request handlers to resolve property access and overload errors.
            return res.status(500).json({ message: `Could not connect to domain '${domain}' on port 443. Ensure the domain is correct and accessible.` });
        }

        const notBeforeMatch = stdout.match(/notBefore=(.*)/);
        const notAfterMatch = stdout.match(/notAfter=(.*)/);

        if (!notBeforeMatch || !notAfterMatch) {
            // FIX: Correctly type Express request handlers to resolve property access and overload errors.
            return res.json({
                isValid: false,
                error: 'No SSL certificate found or the certificate is invalid.',
                issuedAt: null,
                expiresAt: null
            } as SslStatus);
        }
        
        const expiresAt = new Date(notAfterMatch[1]);
        const issuedAt = new Date(notBeforeMatch[1]);

        // FIX: Correctly type Express request handlers to resolve property access and overload errors.
        res.json({
            isValid: expiresAt > new Date(),
            issuedAt: issuedAt.toISOString(),
            expiresAt: expiresAt.toISOString(),
        } as SslStatus);
    });
};
