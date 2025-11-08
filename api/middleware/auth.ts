import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role, User } from '../../types';
// A importação de 'multer' disponibiliza a tipagem Express.Multer.File.
import 'multer';
import { appConfig } from '../services/configService';

// By extending the Express Request interface via declaration merging, we can attach 
// the user property to it and get full type support. This is the standard and
// preferred way to augment Express types.
declare global {
    namespace Express {
        export interface Request {
            user?: User;
        }
    }
}

// FIX: Correctly type Express request handlers to resolve property access and overload errors.
export const protect = (req: Request, res: Response, next: NextFunction) => {
  let token;
  // FIX: Correctly type Express request handlers to resolve property access and overload errors.
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // FIX: Correctly type Express request handlers to resolve property access and overload errors.
      token = req.headers.authorization.split(' ')[1];
      
      if (!appConfig.JWT_SECRET || appConfig.JWT_SECRET === 'default_jwt_secret_please_change') {
          console.error('CRÍTICO: JWT_SECRET não está configurado corretamente. Não é possível verificar o token.');
          // FIX: Correctly type Express request handlers to resolve property access and overload errors.
          return res.status(500).json({ message: 'A autenticação do servidor não está configurada corretamente.' });
      }

      const decoded = jwt.verify(token, appConfig.JWT_SECRET) as User;
      // FIX: Correctly type Express request handlers to resolve property access and overload errors.
      req.user = decoded;
      return next();
    } catch (error) {
      // FIX: Correctly type Express request handlers to resolve property access and overload errors.
      return res.status(401).json({ message: 'Não autorizado, o token falhou' });
    }
  }

  if (!token) {
    // FIX: Correctly type Express request handlers to resolve property access and overload errors.
    return res.status(401).json({ message: 'Não autorizado, sem token' });
  }
};

// FIX: Correctly type Express request handlers to resolve property access and overload errors.
export const admin = (req: Request, res: Response, next: NextFunction) => {
    // FIX: Correctly type Express request handlers to resolve property access and overload errors.
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        // FIX: Correctly type Express request handlers to resolve property access and overload errors.
        res.status(403).json({ message: 'Não autorizado como administrador' });
    }
};

// FIX: Correctly type Express request handlers to resolve property access and overload errors.
export const editor = (req: Request, res: Response, next: NextFunction) => {
    // FIX: Correctly type Express request handlers to resolve property access and overload errors.
    if (req.user && (req.user.role === 'editor' || req.user.role === 'admin')) {
        next();
    } else {
        // FIX: Correctly type Express request handlers to resolve property access and overload errors.
        res.status(403).json({ message: 'Não autorizado como editor ou administrador' });
    }
};
