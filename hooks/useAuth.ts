import { useState, useCallback } from 'react';
import { User } from '../types';
import * as api from '../services/api';

const USER_SESSION_KEY = 'user_session';

const isEmailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const storedUser = sessionStorage.getItem(USER_SESSION_KEY);
      if (storedUser) {
        return JSON.parse(storedUser);
      }
      return null;
    } catch (error) {
      console.error("Failed to parse user session:", error);
      return null;
    }
  });

  const [authError, setAuthError] = useState<string | null>(null);

  const login = useCallback(async (username: string, password?: string) => {
    setAuthError(null);
    try {
      if (!username || !password) {
        setAuthError('authErrorInvalidCredentials');
        return;
      }
      
      const sessionData = await api.login(username, password);
      sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(sessionData));
      
      setUser({
          id: sessionData.id,
          username: sessionData.username,
          role: sessionData.role,
          companyId: sessionData.companyId,
      });

    } catch (error: any) {
        console.error("Login failed:", error);
        if (error.message.toLowerCase().includes('invalid credentials')) {
            setAuthError('authErrorInvalidCredentials');
        } else {
            setAuthError('genericErrorText');
        }
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(USER_SESSION_KEY);
    setUser(null);
  }, []);

  const register = useCallback(async (username: string, password?: string): Promise<boolean> => {
    setAuthError(null);
    if (!isEmailValid(username)) {
        setAuthError('authErrorInvalidEmail');
        return false;
    }
    // FIX: Operator '<' cannot be applied to types 'boolean' and 'number'. Corrected logic.
    if (!password || password.length < 6) {
        setAuthError('authErrorPasswordLength');
        return false;
    }
    
    try {
        await api.register(username, password);
        return true;
    } catch(error: any) {
        console.error("Registration failed:", error);
        if (error.message.toLowerCase().includes('user already exists')) {
             setAuthError('authErrorEmailExists');
        } else {
            setAuthError('genericErrorText');
        }
        return false;
    }
  }, []);

  return { user, login, logout, register, authError, setAuthError };
};