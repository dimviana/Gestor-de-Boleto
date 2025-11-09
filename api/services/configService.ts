
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';

interface AppConfig {
    JWT_SECRET: string;
    API_KEY: string;
    processing_method: 'regex' | 'ai';
    [key: string]: any; 
}

// Initialize with default/fallback values from environment variables
export const appConfig: AppConfig = {
    JWT_SECRET: process.env.JWT_SECRET || 'default_jwt_secret_please_change',
    API_KEY: process.env.API_KEY || '',
    processing_method: (process.env.PROCESSING_METHOD as 'regex' | 'ai') || 'ai',
    ai_settings: { model: 'gemini-2.5-flash', temperature: 0.2, topK: 1, topP: 1 }
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
        if (!appConfig.API_KEY && appConfig.processing_method === 'ai') {
            console.warn('WARNING: API_KEY is not set, but processing method is AI. AI functionality will be disabled.');
        }

        console.log(`Configuration loaded successfully. Processing method: ${appConfig.processing_method}`);
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