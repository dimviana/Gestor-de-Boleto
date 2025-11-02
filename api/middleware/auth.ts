// FIX: Use express types directly to avoid conflicts.
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../../types';

// FIX: Add minimal Multer file interface to avoid Express namespace issues.
// The `Express.Multer.File` type was causing a "Cannot find namespace 'Express'" error.
interface MulterFile {
    buffer: Buffer;
    originalname: string;
}

export interface AuthRequest extends Request {
  user?: User;
  file?: MulterFile;
}

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
