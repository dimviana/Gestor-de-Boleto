


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
// Serve static files from the React build directory.
// After the tsc build, __dirname is <project_root>/dist/api,
// so we go up one level to get to the <project_root>/dist folder which contains the frontend build.
// FIX: Use `__dirname` to construct a reliable path to static assets, which also resolves a TypeScript error on `process.cwd()`.
// FIX: Cast `global` to `any` to access `__dirname` and resolve TypeScript's "Cannot find name '__dirname'" error.
const staticPath = path.join(__dirname, '..');
app.use(express.static(staticPath));

// For any request that doesn't match a static file or an API route,
// send back the main index.html file. This is crucial for client-side routing.
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});


// Test DB connection on startup
testDbConnection().catch(err => {
    console.error("Shutting down due to database connection failure.", err);
    // Throwing the error causes an unhandled rejection, which will terminate the Node.js process.
    throw err;
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});