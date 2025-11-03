
// FIX: Import explicit types from Express to ensure correct type resolution.
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../../types';
// Import 'multer' to make Express.Multer.File type augmentation available.
import 'multer';
import { appConfig } from '../services/configService';

// By extending express.Request, AuthRequest inherits standard properties
// like `headers`, `body`, `file`, etc., resolving type errors in controllers.
// FIX: Extend `Request` from express and remove redundant `file` property.
// The `multer` import augments the base `Request` type to include `file`.
export interface AuthRequest extends Request {
  user?: User;
}

// FIX: Use AuthRequest, dynamic appConfig, and add returns for correct control flow.
export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      if (!appConfig.JWT_SECRET) {
          return res.status(500).json({ message: 'Server authentication not configured' });
      }
      const decoded = jwt.verify(token, appConfig.JWT_SECRET) as User;
      req.user = decoded;
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// FIX: Use AuthRequest to fix type error.
export const admin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};
