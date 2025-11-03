// FIX: Import explicit types from Express to ensure correct type resolution.
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../../types';
// Import 'multer' to make Express.Multer.File type augmentation available.
import 'multer';

// By extending express.Request, AuthRequest inherits standard properties
// like `headers`, `body`, `file`, etc., resolving type errors in controllers.
// FIX: Extend `Request` from express and remove redundant `file` property.
// The `multer` import augments the base `Request` type to include `file`.
export interface AuthRequest extends Request {
  user?: User;
}

// Use explicit express types for request, response, and next function.
// FIX: Use explicit types for middleware parameters.
export const protect = (req: Request, res: Response, next: NextFunction) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as User;
      (req as AuthRequest).user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Use explicit express types for request, response, and next function.
// FIX: Use explicit types for middleware parameters.
export const admin = (req: Request, res: Response, next: NextFunction) => {
    if ((req as AuthRequest).user && (req as AuthRequest).user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};