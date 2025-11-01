

// FIX: Changed express import to a namespace import to resolve type conflicts with DOM types.
import * as express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { testDbConnection } from '../config/db';

import authRoutes from './routes/auth';
import boletoRoutes from './routes/boletos';
import companyRoutes from './routes/companies';
import userRoutes from './routes/users';
import logRoutes from './routes/logs';
import settingsRoutes from './routes/settings';

dotenv.config();

const app: express.Application = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Test DB connection on startup
testDbConnection().catch(err => {
    console.error("Shutting down due to database connection failure.", err);
    // FIX: 'process.exit' can cause type errors in mixed environments.
    // Throwing the error causes an unhandled rejection, which will terminate the Node.js process.
    throw err;
});

// API Routes
// FIX: Add explicit express types to request and response objects.
app.get('/api', (req: express.Request, res: express.Response) => {
  res.send('Boleto Manager AI Backend is running!');
});

app.use('/api/auth', authRoutes);
app.use('/api/boletos', boletoRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/settings', settingsRoutes);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
