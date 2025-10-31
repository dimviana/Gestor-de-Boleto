import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../../types';

// FIX: To resolve type conflicts with the global DOM `Request`, we now explicitly
// use the `express` namespace for all Express-related types. This ensures that
// properties like `.headers`, `.body`, etc., are correctly recognized.
export interface AuthRequest extends express.Request {
  user?: User;
}

export const protect = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
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

export const admin = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};
