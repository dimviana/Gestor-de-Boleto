
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../../types';

// By extending Request from express, AuthRequest inherits standard properties
// like `headers`, `body`, `file`, etc., resolving type errors in controllers.
// FIX: Switched from an interface to a type intersection. This robustly ensures
// that AuthRequest inherits all properties from the base express.Request type,
// resolving type errors in controllers that use it.
export type AuthRequest = Request & {
  user?: User;
};

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

export const admin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};