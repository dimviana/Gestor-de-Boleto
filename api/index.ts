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
import vpsRoutes from './routes/vps';
import sslRoutes from './routes/ssl';

dotenv.config();

declare const __dirname: string;

const app = express();
const port = process.env.PORT || 3001;

// --- Core Middleware ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- API Router Setup ---
// Group all API routes under a single router to ensure they are handled before static serving.
const apiRouter = express.Router();

// Health check for the API
apiRouter.get('/', (req: Request, res: Response) => {
  res.send('Boleto Manager AI Backend is running!');
});

// Mount all controller routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/boletos', boletoRoutes);
apiRouter.use('/companies', companyRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/logs', logRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/vps', vpsRoutes);
apiRouter.use('/ssl', sslRoutes);

// Mount the entire API router at the /api prefix. This MUST come before frontend serving.
app.use('/api', apiRouter);


// --- Frontend Serving ---
// When running from dist/api/index.js, __dirname is '.../dist/api', so '..' goes to '.../dist'
const staticPath = path.join(__dirname, '..');

// 1. Serve static assets (JS, CSS, images) from the build directory.
app.use(express.static(staticPath));

// 2. SPA Fallback: For any GET request that doesn't match a static file or an API route,
// serve the main index.html file. This is crucial for client-side routing.
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});


// --- Server Startup ---
testDbConnection().catch(err => {
    console.error("Shutting down due to database connection failure.", err);
    throw err;
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
