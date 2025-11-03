
// FIX: Use named imports for Express types to ensure consistency and resolve conflicts.
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../../types';
// FIX: Import 'multer' to make Express.Multer.File type augmentation available.
import 'multer';

// By extending Request from express, AuthRequest inherits standard properties
// like `headers`, `body`, `file`, etc., resolving type errors in controllers.
// FIX: Switched from a type intersection to an interface extending express.Request to ensure
// that AuthRequest inherits all properties from the base express.Request type,
// resolving type errors in controllers that use it.
export interface AuthRequest extends Request {
  user?: User;
  // FIX: Add file property from multer to avoid type errors in controllers
  file?: Express.Multer.File;
}

// FIX: Use explicit express types for request, response, and next function.
export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as User;
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// FIX: Use explicit express types for request, response, and next function.
export const admin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};