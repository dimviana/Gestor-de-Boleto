import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';

const execPromise = util.promisify(exec);

const PROJECT_PATH = process.env.PROJECT_PATH || path.join(process.env.HOME || '~', 'boleto-manager-ai');
const BACKUP_PATH = process.env.BACKUP_PATH || path.join(process.env.HOME || '~', 'db_backups');
const APP_NAME = process.env.APP_NAME || 'boleto-manager-ai';

// FIX: Correctly type res parameter.
export const getUpdateHistory = async (req: AuthRequest, res: Response) => {
    try {
        const [history] = await pool.query<RowDataPacket[]>('SELECT * FROM deployments ORDER BY deployed_at DESC');
        res.json(history);
    } catch (error) {
        console.error("Error fetching deployment history:", error);
        res.status(500).json({ message: "Server error while fetching history." });
    }
};

// FIX: Correctly type res parameter.
export const triggerRollback = async (req: AuthRequest, res: Response) => {
    const { deploymentId } = req.body;
    if (!deploymentId) {
        return res.status(400).json({ message: "Deployment ID is required." });
    }

    let logOutput = '';
    const log = (message: string) => {
        console.log(message);
        logOutput += message + '\n';
    };

    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM deployments WHERE id = ?', [deploymentId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Deployment not found." });
        }

        const deployment = rows[0];
        const { commit_sha, db_backup_filename } = deployment;

        const dbConfig = {
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            host: process.env.DB_HOST,
        };
        
        const backupFilePath = path.join(BACKUP_PATH, db_backup_filename);

        // --- Execute Rollback Steps ---
        log(`--- Starting Rollback to version ${commit_sha.substring(0,7)} ---`);

        // 1. Restore Database
        log(`[1/5] Restoring database from backup: ${db_backup_filename}...`);
        const restoreCommand = `mysql -h ${dbConfig.host} -u ${dbConfig.user} -p'${dbConfig.password}' ${dbConfig.database} < ${backupFilePath}`;
        const { stderr: restoreStderr } = await execPromise(restoreCommand);
        if (restoreStderr) log(`DB Restore (stderr): ${restoreStderr}`);
        log('Database restored successfully.');

        // 2. Git Checkout to previous commit
        log(`[2/5] Reverting code to commit ${commit_sha}...`);
        const gitCommand = `cd ${PROJECT_PATH} && git checkout -f ${commit_sha}`;
        const { stderr: gitStderr } = await execPromise(gitCommand);
        if (gitStderr) log(`Git Checkout (stderr): ${gitStderr}`);
        log('Code reverted successfully.');

        // 3. Reinstall dependencies
        log('[3/5] Reinstalling dependencies (npm install)...');
        const npmCommand = `cd ${PROJECT_PATH} && npm install`;
        const { stderr: npmStderr } = await execPromise(npmCommand);
        if (npmStderr) log(`NPM Install (stderr): ${npmStderr}`);
        log('Dependencies installed successfully.');

        // 4. Rebuild project
        log('[4/5] Rebuilding project (npm run build)...');
        const buildCommand = `cd ${PROJECT_PATH} && npm run build`;
        const { stderr: buildStderr } = await execPromise(buildCommand);
        if (buildStderr) log(`Build (stderr): ${buildStderr}`);
        log('Project rebuilt successfully.');

        // 5. Restart application with PM2
        log(`[5/5] Initiating application restart with PM2...`);
        const pm2Command = `pm2 restart ${APP_NAME}`;
        
        // Fire and forget. We don't await this because it will kill the current process.
        exec(pm2Command, (error, stdout, stderr) => {
            if (error) log(`Error initiating PM2 restart: ${error.message}`);
            if (stderr) log(`PM2 restart stderr: ${stderr}`);
            if (stdout) log(`PM2 restart stdout: ${stdout}`);
        });

        log('--- Rollback process finished. Server is restarting. ---');

        // Send response immediately before the server goes down for restart.
        res.status(200).json({ message: "Rollback initiated. The application is restarting.", log: logOutput });

    } catch (error: any) {
        console.error("Rollback failed:", error);
        log(`--- ROLLBACK FAILED ---`);
        log(error.stderr || error.stdout || error.message);
        res.status(500).json({ message: "An error occurred during rollback.", log: logOutput });
    }
};