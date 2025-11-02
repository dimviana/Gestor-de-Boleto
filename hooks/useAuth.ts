
import { useState, useCallback } from 'react';
import { User, RegisteredUser, LogEntry } from '../types';
import { addLogEntry, getLogsFromStorage } from '../services/logService';

const USER_SESSION_KEY = 'user_session';
const isEmailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const storedUser = sessionStorage.getItem(USER_SESSION_KEY);
      if (storedUser) {
        const session = JSON.parse(storedUser);
        return {
          id: session.id,
          username: session.username,
          role: session.role,
          companyId: session.companyId,
        };
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
      
      const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
      });

      if (response.ok) {
          const sessionData = await response.json(); // { id, username, role, companyId, token }
          sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(sessionData));
          
          const sessionUser: User = {
              id: sessionData.id,
              username: sessionData.username,
              role: sessionData.role,
              companyId: sessionData.companyId,
          };
          
          setUser(sessionUser);
      } else {
          const errorData = await response.json();
          setAuthError(errorData.message || 'authErrorInvalidCredentials');
      }
    } catch (error) {
        console.error("Login API call failed:", error);
        setAuthError('genericErrorText');
    }
  }, []);

  const logout = useCallback(() => {
    // Logging out is a client-side action, logging can remain here.
    const storedSession = sessionStorage.getItem(USER_SESSION_KEY);
    if (storedSession) {
        try {
            const currentUser = JSON.parse(storedSession);
            addLogEntry({ userId: currentUser.id, username: currentUser.username, action: 'LOGOUT', details: 'Usuário saiu do sistema.' });
        } catch(e) {
            // Ignore if session is malformed
        }
    }
    sessionStorage.removeItem(USER_SESSION_KEY);
    setUser(null);
  }, []);

  const register = useCallback(async (username: string, password?: string): Promise<boolean> => {
    setAuthError(null);
    if (!isEmailValid(username)) {
        setAuthError('authErrorInvalidEmail');
        return false;
    }
    if (!password || password.length < 6) {
        setAuthError('authErrorPasswordLength');
        return false;
    }
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            return true;
        } else {
            const errorData = await response.json();
            // Map backend error messages to translation keys
            if (errorData.message.includes('already exists')) {
                 setAuthError('authErrorEmailExists');
            } else {
                 setAuthError('genericErrorText');
            }
            return false;
        }

    } catch(error) {
        console.error("Registration API call failed:", error);
        setAuthError('genericErrorText');
        return false;
    }
  }, []);
  
  return { user, login, logout, register, authError, setAuthError };
};