
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';

interface AppConfig {
    JWT_SECRET: string;
    [key: string]: any; 
}

// Initialize with default/fallback values from environment variables
export const appConfig: AppConfig = {
    JWT_SECRET: process.env.JWT_SECRET || 'default_jwt_secret_please_change',
};

export const loadConfigFromDB = async (): Promise<void> => {
    console.log('Loading configuration from database...');
    try {
        const [settings] = await pool.query<RowDataPacket[]>("SELECT setting_key, setting_value FROM settings");
        
        settings.forEach(setting => {
            if (setting.setting_value) { 
                try {
                    appConfig[setting.setting_key] = JSON.parse(setting.setting_value);
                } catch(e) {
                    appConfig[setting.setting_key] = setting.setting_value;
                }
            }
        });

        if (!appConfig.JWT_SECRET || appConfig.JWT_SECRET === 'default_jwt_secret_please_change') {
            console.warn('WARNING: JWT_SECRET is not set in the database or .env file. Using a default, insecure key is not recommended for production.');
        }

        console.log(`Configuration loaded successfully.`);
    } catch (error) {
        console.error('Failed to load configuration from database. Falling back to environment variables.', error);
    }
};

// Function to update a specific config value in memory
export const updateInMemoryConfig = (key: string, value: any) => {
    if (key in appConfig || key.startsWith('whitelabel_')) {
        appConfig[key] = value;
        console.log(`In-memory config for '${key}' updated.`);
    }
};