
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { testDbConnection } from '../config/db';
import { loadConfigFromDB } from './services/configService';

import authRoutes from './routes/auth';
import boletoRoutes from './routes/boletos';
import companyRoutes from './routes/companies';
import userRoutes from './routes/users';
import logRoutes from './routes/logs';
import settingsRoutes from './routes/settings';
import sslRoutes from './routes/ssl';


dotenv.config();

const app: express.Express = express();
const port = process.env.PORT || 3001;

// --- Core Middleware ---
app.use(cors());
// Correctly type Express request handlers to resolve property access and overload errors.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- API ROUTER ---
// Group all API routes under a single router to ensure they are treated as a block.
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/boletos', boletoRoutes);
apiRouter.use('/companies', companyRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/logs', logRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/ssl', sslRoutes);

// Health check for the API router itself
// FIX: Add Request and Response types to the handler.
const healthCheckHandler = (req: express.Request, res: express.Response) => {
  res.send('Boleto Manager AI Backend is running!');
};
apiRouter.get('/', healthCheckHandler);

// Mount the entire API router at the /api prefix.
// This is the first routing middleware the app encounters, ensuring API requests are handled first.
app.use('/api', apiRouter);


// --- FRONTEND SERVING ---
// The static assets and the SPA fallback are handled after the API.
const staticPath = path.join(__dirname, '..');

// 1. Serve static assets (JS, CSS, images) from the build directory.
app.use(express.static(staticPath));

// 2. SPA Fallback: For any GET request that doesn't match an API route or a static file,
// serve the main index.html file. This is crucial for client-side routing.
// FIX: Add Request and Response types to the handler.
const spaFallbackHandler = (req: express.Request, res: express.Response) => {
  // This guard prevents the fallback from ever serving index.html for an API-like route.
  if (req.path.startsWith('/api/')) {
    return res.status(404).send('API endpoint not found.');
  }
  res.sendFile(path.join(staticPath, 'index.html'));
};
app.get('/*', spaFallbackHandler);


// --- Server Startup ---
const startServer = async () => {
    await testDbConnection();
    await loadConfigFromDB(); // Load config before starting to listen

    app.listen(port, () => {
      console.log(`[server]: Server is running at http://localhost:${port}`);
    });
};

startServer().catch(err => {
    console.error("Server startup failed.", err);
    throw err;
});