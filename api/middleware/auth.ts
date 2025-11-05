






import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role, User } from '../../types';
// A importação de 'multer' disponibiliza a tipagem Express.Multer.File.
import 'multer';
import { appConfig } from '../services/configService';

// Ao estender Request do Express, AuthRequest herda propriedades padrão
// como `headers`, `body`, `file`, etc., resolvendo erros de tipo nos controllers.
// FIX: Reverted to interface to ensure proper type extension from express.Request.
export interface AuthRequest extends Request {
  user?: User;
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
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

export const admin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Não autorizado como administrador' });
    }
};

export const editor = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user && (req.user.role === 'editor' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Não autorizado como editor ou administrador' });
    }
};