import { useState, useEffect, useCallback } from 'react';
import { User } from '../types';

const USER_SESSION_KEY = 'user_session';

export const useUser = () => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const storedUser = sessionStorage.getItem(USER_SESSION_KEY);
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error("Failed to parse user session:", error);
      return null;
    }
  });

  const login = useCallback((userToLogin: User) => {
    sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(userToLogin));
    setUser(userToLogin);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(USER_SESSION_KEY);
    setUser(null);
  }, []);
  
  return { user, login, logout };
};
