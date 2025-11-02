




// FIX: Import express default and use qualified types to avoid global conflicts.
import express, { NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../../types';

// By extending express.Request, AuthRequest inherits standard properties
// like `headers`, `body`, `file`, etc., resolving type errors in controllers.
export interface AuthRequest extends express.Request {
  user?: User;
}

export const protect = (req: AuthRequest, res: express.Response, next: NextFunction) => {
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

export const admin = (req: AuthRequest, res: express.Response, next: NextFunction) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};