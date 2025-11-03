import { useState, useCallback, useEffect } from 'react';
import { User, RegisteredUser, LogEntry } from '../types';
import * as api from '../services/api';

const USER_SESSION_KEY = 'user_session';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(USER_SESSION_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user session:", error);
      localStorage.removeItem(USER_SESSION_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password?: string) => {
    setAuthError(null);
    try {
      if (!password) {
        setAuthError('authErrorInvalidCredentials');
        return;
      }

      const loggedInUser = await api.login(username, password);
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(loggedInUser));
      setUser(loggedInUser);
    } catch (error: any) {
      console.error("Login failed:", error);
      setAuthError(error.message || 'authErrorInvalidCredentials');
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(USER_SESSION_KEY);
    setUser(null);
  }, []);

  const register = useCallback(async (username: string, password?: string): Promise<boolean> => {
    setAuthError(null);
    try {
      await api.register(username, password);
      return true;
    } catch (error: any) {
      console.error("Registration failed:", error);
      setAuthError(error.message || 'authErrorEmailExists');
      return false;
    }
  }, []);

  const getUsers = useCallback((): Promise<RegisteredUser[]> => {
    return api.fetchUsers();
  }, []);
  
  const getLogs = useCallback((): Promise<LogEntry[]> => {
      return api.fetchLogs();
  }, []);
  
  // Return isLoading to prevent rendering the app before session is checked
  if (isLoading) {
      return { user: null, login, logout, register, authError, setAuthError, getUsers, getLogs };
  }

  return { user, login, logout, register, authError, setAuthError, getUsers, getLogs };
};