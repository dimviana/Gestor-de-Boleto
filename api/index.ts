// FIX: Import explicit types from express to avoid conflicts and resolve type errors.
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { testDbConnection } from '../config/db';

import authRoutes from './routes/auth';
import boletoRoutes from './routes/boletos';
import companyRoutes from './routes/companies';
import userRoutes from './routes/users';
import logRoutes from './routes/logs';
import settingsRoutes from './routes/settings';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
// FIX: Use explicit Request and Response types.
app.get('/api', (req: Request, res: Response) => {
  res.send('Boleto Manager AI Backend is running!');
});
app.use('/api/auth', authRoutes);
app.use('/api/boletos', boletoRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/settings', settingsRoutes);

// --- Frontend Serving ---
const staticPath = path.join(__dirname, '..', '..');
app.use(express.static(staticPath));

// FIX: Use explicit Request and Response types.
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Test DB connection on startup
testDbConnection().catch(err => {
    console.error("Shutting down due to database connection failure.", err);
    throw err;
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});