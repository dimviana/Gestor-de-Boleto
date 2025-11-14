
// FIX: Changed express import to directly include types for Request and Response, resolving type inference issues.
import express, { Request, Response } from 'express';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

// FIX: Updated function signature to use directly imported express types.
export const sendReminders = async (req: Request, res: Response) => {
    const { companyId } = req.body;
    const user = req.user!;

    if (!companyId) {
        return res.status(400).json({ message: 'Company ID is required.' });
    }

    // Security check: an editor can only send reminders for their own company
    if (user.role === 'editor' && user.companyId !== companyId) {
        return res.status(403).json({ message: 'Forbidden: You can only send reminders for your own company.' });
    }
    
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const today = new Date();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(today.getDate() + 7);

        // Format dates to 'YYYY-MM-DD' for SQL query
        const limitDate = sevenDaysFromNow.toISOString().split('T')[0];

        const [boletosToRemind] = await connection.query<RowDataPacket[]>(
            "SELECT id, recipient, due_date, amount FROM boletos WHERE company_id = ? AND status = 'PAGAR' AND due_date <= ?",
            [companyId, limitDate]
        );

        if (boletosToRemind.length === 0) {
            await connection.rollback();
            return res.json({ message: 'No reminders to send.', count: 0 });
        }

        const [usersToNotify] = await connection.query<RowDataPacket[]>(
            "SELECT username FROM users WHERE company_id = ? AND role IN ('admin', 'editor')",
            [companyId]
        );

        const recipientEmails = usersToNotify.map(u => u.username);

        // --- SIMULATE EMAIL SENDING ---
        // In a real application, you would integrate an email service like Nodemailer here.
        // For now, we log the action to the console and the database.
        console.log(`[Notification Simulation]
            Company ID: ${companyId}
            Triggered by: ${user.username}
            Would send reminders for ${boletosToRemind.length} boletos.
            Recipients: ${recipientEmails.join(', ')}
        `);
        // --- END SIMULATION ---
        
        await connection.query(
            'INSERT INTO activity_logs (id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
            [
                uuidv4(),
                user.id,
                user.username,
                'SEND_EMAIL_REMINDERS',
                `Simulated sending email reminders for ${boletosToRemind.length} boletos for company ID ${companyId}.`
            ]
        );

        await connection.commit();
        res.json({ message: 'Simulated sending reminders successfully.', count: boletosToRemind.length });

    } catch (error) {
        await connection.rollback();
        console.error("Error in sendReminders controller:", error);
        res.status(500).json({ message: 'Server error while processing reminders.' });
    } finally {
        connection.release();
    }
};

export const sendTestEmail = async (req: Request, res: Response) => {
    const smtpSettings = req.body;
    const user = req.user!;
    const recipientEmail = user.username;

    // In a real app, you would use these settings with a library like Nodemailer.
    // For now, we just simulate the process.
    console.log(`[Email Test Simulation]
        Triggered by: ${user.username}
        Recipient: ${recipientEmail}
        SMTP Config Used:
            Host: ${smtpSettings.smtp_host}
            Port: ${smtpSettings.smtp_port}
            User: ${smtpSettings.smtp_user}
            Secure: ${smtpSettings.smtp_secure}
            From: ${smtpSettings.smtp_from}
        WOULD SEND TEST EMAIL NOW.
    `);

    // Log this action
    try {
        await pool.query(
            'INSERT INTO activity_logs (id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
            [
                uuidv4(),
                user.id,
                user.username,
                'ADMIN_CHANGE_SETTINGS',
                `Sent a test email to ${recipientEmail} to verify SMTP settings.`
            ]
        );
        res.json({ message: 'testEmailSentSuccess' });
    } catch (error) {
        console.error('Failed to log test email action:', error);
        res.status(500).json({ message: 'testEmailSentError' });
    }
};