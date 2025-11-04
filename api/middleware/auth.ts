// FIX: Use default import for express to ensure proper type resolution.
import express from 'express';
import jwt from 'jsonwebtoken';
import { Role, User } from '../../types';
// Import 'multer' to make Express.Multer.File type augmentation available.
import 'multer';
import { appConfig } from '../services/configService';

// By extending express.Request, AuthRequest inherits standard properties
// like `headers`, `body`, `file`, etc., resolving type errors in controllers.
// The `multer` import augments the base `Request` type to include `file`.
export interface AuthRequest extends express.Request {
  user?: User;
}

export const protect = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      // Robust check for a valid JWT secret
      if (!appConfig.JWT_SECRET || appConfig.JWT_SECRET === 'default_jwt_secret_please_change') {
          console.error('CRITICAL: JWT_SECRET is not configured correctly. Cannot verify token.');
          return res.status(500).json({ message: 'Server authentication is not properly configured.' });
      }

      const decoded = jwt.verify(token, appConfig.JWT_SECRET) as User;
      req.user = decoded;
      return next();
    } catch (error) {
      // This will now primarily catch expired/malformed tokens, not server config errors.
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const admin = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

export const editor = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    if (req.user && (req.user.role === 'editor' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an editor or admin' });
    }
};
