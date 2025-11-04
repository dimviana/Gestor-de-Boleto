// FIX: Use qualified express types to resolve conflicts with global DOM types.
import express from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../../config/db';
import { VpsSettings } from '../../types';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { NodeSSH } from 'node-ssh';

export const getVpsSettings = async (req: AuthRequest, res: express.Response) => {
  const user = req.user!;
  if (!user.companyId) {
    return res.status(400).json({ message: 'Admin user must be associated with a company.' });
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM vps_settings WHERE company_id = ?', [user.companyId]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: 'No VPS settings found for this company.' });
    }
  } catch (error) {
    console.error('Error fetching VPS settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const saveVpsSettings = async (req: AuthRequest, res: express.Response) => {
  const user = req.user!;
  const { hostname, username, password, ssh_port, project_path } = req.body;

  if (!user.companyId) {
    return res.status(400).json({ message: 'Admin user must be associated with a company.' });
  }
  if (!hostname || !username || !password || !ssh_port || !project_path) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  try {
    const settings: VpsSettings = {
      id: uuidv4(),
      company_id: user.companyId,
      hostname,
      username,
      password, // In a real app, this should be encrypted
      ssh_port,
      project_path,
    };

    await pool.query(
      'INSERT INTO vps_settings (id, company_id, hostname, username, password, ssh_port, project_path) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE hostname = VALUES(hostname), username = VALUES(username), password = VALUES(password), ssh_port = VALUES(ssh_port), project_path = VALUES(project_path)',
      [settings.id, settings.company_id, settings.hostname, settings.username, settings.password, settings.ssh_port, settings.project_path]
    );

    res.status(200).json({ message: 'VPS settings saved successfully.' });
  } catch (error) {
    console.error('Error saving VPS settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const triggerUpdate = async (req: AuthRequest, res: express.Response) => {
    const user = req.user!;
    if (!user.companyId) {
        return res.status(400).json({ message: 'Admin user must be associated with a company.' });
    }

    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM vps_settings WHERE company_id = ?', [user.companyId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'VPS settings not found. Please configure them first.' });
        }
        
        const settings = rows[0] as VpsSettings;
        if (!settings.project_path) {
            return res.status(404).json({ message: 'Project path not found in VPS settings. Please configure it first.' });
        }

        const ssh = new NodeSSH();

        await ssh.connect({
            host: settings.hostname,
            username: settings.username,
            password: settings.password,
            port: settings.ssh_port,
        });

        // The command needs to provide '2' as input to the script for the update option.
        const command = `cd ${settings.project_path} && echo "2" | bash deploy.txt`;
        const result = await ssh.execCommand(command);

        ssh.dispose();

        if (result.code !== 0) {
            return res.status(500).json({
                message: 'Update script failed to execute.',
                stdout: result.stdout,
                stderr: result.stderr,
            });
        }
        
        res.status(200).json({
            message: 'Update process initiated successfully!',
            output: result.stdout,
        });

    } catch (error: any) {
        console.error('SSH connection or command execution failed:', error);
        res.status(500).json({ message: `Failed to connect or execute command: ${error.message}` });
    }
};