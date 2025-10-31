
import { useState, useCallback } from 'react';
import { User, RegisteredUser, Role } from '../types';

const USER_SESSION_KEY = 'user_session';
const REGISTERED_USERS_KEY = 'registered_users';

const isEmailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const storedUser = sessionStorage.getItem(USER_SESSION_KEY);
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error("Failed to parse user session:", error);
      return null;
    }
  });

  const [authError, setAuthError] = useState<string | null>(null);

  const getRegisteredUsers = (): RegisteredUser[] => {
    try {
        const storedUsers = localStorage.getItem(REGISTERED_USERS_KEY);
        return storedUsers ? JSON.parse(storedUsers) : [];
    } catch (error) {
        console.error("Failed to parse registered users:", error);
        return [];
    }
  };

  const setRegisteredUsers = (users: RegisteredUser[]) => {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
  };

  const login = useCallback((username: string, password?: string) => {
    setAuthError(null);
    if (username.toLowerCase() === 'admin') {
      const adminUser: User = { id: 'admin-user', username: 'admin', role: 'admin' };
      sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(adminUser));
      setUser(adminUser);
      return;
    }

    const registeredUsers = getRegisteredUsers();
    const foundUser = registeredUsers.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (foundUser && foundUser.password === password) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...sessionUser } = foundUser;
      sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(sessionUser));
      setUser(sessionUser);
    } else {
      setAuthError('authErrorInvalidCredentials');
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(USER_SESSION_KEY);
    setUser(null);
  }, []);

  const register = useCallback((username: string, password?: string): boolean => {
    setAuthError(null);
    if (!isEmailValid(username)) {
        setAuthError('authErrorInvalidEmail');
        return false;
    }
    if (!password || password.length < 6) {
        setAuthError('authErrorPasswordLength');
        return false;
    }

    const registeredUsers = getRegisteredUsers();
    if (registeredUsers.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        setAuthError('authErrorEmailExists');
        return false;
    }

    const newUser: RegisteredUser = {
        id: crypto.randomUUID(),
        username,
        password,
        role: 'user'
    };

    const updatedUsers = [...registeredUsers, newUser];
    setRegisteredUsers(updatedUsers);
    
    return true;
  }, []);

  const getUsers = useCallback((): RegisteredUser[] => {
      return getRegisteredUsers();
  }, []);

  const updateUser = useCallback((userId: string, updates: Partial<Pick<RegisteredUser, 'role'>>): boolean => {
      if (userId === 'admin-user') return false;

      const users = getRegisteredUsers();
      const userIndex = users.findIndex(u => u.id === userId);

      if(userIndex === -1) return false;

      users[userIndex] = { ...users[userIndex], ...updates };
      setRegisteredUsers(users);
      return true;
  }, []);

  const deleteUser = useCallback((userId: string): boolean => {
      if (userId === 'admin-user') return false;
      
      const loggedInUser: User | null = JSON.parse(sessionStorage.getItem(USER_SESSION_KEY) || 'null');
      if (loggedInUser && loggedInUser.id === userId) {
          console.error("Cannot delete the currently logged-in user.");
          return false; // Prevent self-deletion
      }

      const users = getRegisteredUsers();
      const updatedUsers = users.filter(u => u.id !== userId);
      setRegisteredUsers(updatedUsers);
      return true;
  }, []);
  
  return { user, login, logout, register, authError, setAuthError, getUsers, updateUser, deleteUser };
};