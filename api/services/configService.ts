
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';
import { randomBytes } from 'crypto';

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
    const connection = await pool.getConnection(); // Use a single connection for transaction
    try {
        await connection.beginTransaction();

        // Lock the settings table to prevent race conditions on first startup
        const [settings] = await connection.query<RowDataPacket[]>("SELECT setting_key, setting_value FROM settings FOR UPDATE");
        
        const dbConfig: { [key: string]: any } = {};
        settings.forEach(setting => {
            try {
                // An empty string is a valid value for some settings (e.g. logoUrl)
                if (typeof setting.setting_value === 'string' && (setting.setting_value.startsWith('{') || setting.setting_value.startsWith('['))) {
                    dbConfig[setting.setting_key] = JSON.parse(setting.setting_value);
                } else {
                    dbConfig[setting.setting_key] = setting.setting_value;
                }
            } catch(e) {
                dbConfig[setting.setting_key] = setting.setting_value;
            }
        });

        // Overwrite in-memory config with DB values. This establishes DB as source of truth.
        Object.assign(appConfig, dbConfig);
        
        let jwtSecret = appConfig.JWT_SECRET;
        const insecurePlaceholders = ['default_jwt_secret_please_change', 'your_super_secret_jwt_key_here', 'your_super_secret_jwt_key'];

        // If JWT secret from DB is missing, empty, or a known insecure placeholder, we must fix it.
        if (!jwtSecret || insecurePlaceholders.includes(jwtSecret)) {
            let newSecret = process.env.JWT_SECRET;
            
            // Check if env secret is also bad/missing
            if (!newSecret || insecurePlaceholders.includes(newSecret)) {
                newSecret = randomBytes(32).toString('hex');
                console.warn('WARNING: A secure JWT_SECRET was not found. A new secret has been generated automatically. All previous user sessions are now invalid.');
            } else {
                console.log('Initializing JWT_SECRET from environment variable into the database.');
            }
            
            // Save the new/updated secret to the database
            await connection.query(
                'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                ['JWT_SECRET', newSecret, newSecret]
            );
            appConfig.JWT_SECRET = newSecret; // Update in-memory config
        }

        await connection.commit();
        console.log(`Configuration loaded and validated successfully.`);

    } catch (error) {
        await connection.rollback();
        console.error('Failed to load or initialize configuration from database. The application may not function correctly.', error);
        // Critical fallback: if DB fails, still try to use a valid env var.
        const envSecret = process.env.JWT_SECRET;
        if(envSecret && !['default_jwt_secret_please_change', 'your_super_secret_jwt_key_here'].includes(envSecret)) {
            appConfig.JWT_SECRET = envSecret;
            console.log('Fell back to using JWT_SECRET from environment variables due to DB error.');
        }
    } finally {
        connection.release();
    }
};


// Function to update a specific config value in memory
export const updateInMemoryConfig = (key: string, value: any) => {
    if (key in appConfig || key.startsWith('whitelabel_')) {
        appConfig[key] = value;
        console.log(`In-memory config for '${key}' updated.`);
    }
};