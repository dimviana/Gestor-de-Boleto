
// FIX: Changed express import to directly include types for Request, Response, and NextFunction, resolving type inference issues.
import express, { Request, Response, NextFunction } from 'express';
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

// FIX: Updated function signature to use directly imported express types.
export const protect = (req: Request, res: Response, next: NextFunction) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      if (!appConfig.JWT_SECRET || appConfig.JWT_SECRET === 'default_jwt_secret_please_change') {
          console.error('CRÍTICO: JWT_SECRET não está configurado corretamente. Não é possível verificar o token.');
          return res.status(500).json({ message: 'A autenticação do servidor não está configurada corretamente.' });
      }

      const decoded = jwt.verify(token, appConfig.JWT_SECRET) as User;
      req.user = decoded;
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Não autorizado, o token falhou' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Não autorizado, sem token' });
  }
};

// FIX: Updated function signature to use directly imported express types.
export const admin = (req: Request, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Não autorizado como administrador' });
    }
};

// FIX: Updated function signature to use directly imported express types.
export const editor = (req: Request, res: Response, next: NextFunction) => {
    if (req.user && (req.user.role === 'editor' || req.user.role === 'admin' || req.user.role === 'company_admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Não autorizado como editor ou superior' });
    }
};

// FIX: Updated function signature to use directly imported express types.
export const companyAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.user && (req.user.role === 'company_admin' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Não autorizado como administrador da empresa ou superior' });
    }
};