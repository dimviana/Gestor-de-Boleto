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
      if (username.toLowerCase() === 'admin' && !password) {
        // Handle frontend-only admin access for demo/fallback
        const adminUser: User = { id: 'admin-user', username: 'admin', role: 'admin' };
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(adminUser));
        setUser(adminUser);
        return;
      }

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
  
  const addUser = useCallback(async (actor: User, newUser: Omit<RegisteredUser, 'id'>): Promise<boolean> => {
      try {
          await api.createUser(newUser);
          return true;
      } catch (error: any) {
          setAuthError(error.message || 'addUserErrorDuplicate');
          return false;
      }
  }, []);

  const updateUser = useCallback(async (actor: User, targetUserId: string, updates: Partial<Omit<RegisteredUser, 'id'>>): Promise<boolean> => {
      try {
          await api.updateUser(targetUserId, updates);
          return true;
      } catch (error: any) {
          setAuthError(error.message || 'genericErrorText');
          return false;
      }
  }, []);

  const deleteUser = useCallback(async (actor: User, targetUserId: string): Promise<boolean> => {
      if (actor.id === targetUserId) {
          setAuthError('deleteSelfError');
          return false;
      }
      try {
          await api.deleteUser(targetUserId);
          return true;
      } catch (error: any) {
          setAuthError(error.message || 'deleteUserError');
          return false;
      }
  }, []);
  
  const getLogs = useCallback((): Promise<LogEntry[]> => {
      return api.fetchLogs();
  }, []);
  
  // Return isLoading to prevent rendering the app before session is checked
  if (isLoading) {
      return { user: null, login, logout, register, authError, setAuthError, getUsers, addUser, updateUser, deleteUser, getLogs };
  }

  return { user, login, logout, register, authError, setAuthError, getUsers, addUser, updateUser, deleteUser, getLogs };
};
