
import { useState, useCallback } from 'react';
import { User, RegisteredUser, LogEntry } from '../types';
import { addLogEntry, getLogsFromStorage } from '../services/logService';

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
      addLogEntry({ userId: adminUser.id, username: adminUser.username, action: 'LOGIN', details: 'Administrador acessou o sistema.' });
      return;
    }

    const registeredUsers = getRegisteredUsers();
    const foundUser = registeredUsers.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (foundUser && foundUser.password === password) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...sessionUser } = foundUser;
      sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(sessionUser));
      setUser(sessionUser);
      addLogEntry({ userId: sessionUser.id, username: sessionUser.username, action: 'LOGIN', details: 'Usuário acessou o sistema.' });
    } else {
      setAuthError('authErrorInvalidCredentials');
    }
  }, []);

  const logout = useCallback(() => {
    const currentUser = JSON.parse(sessionStorage.getItem(USER_SESSION_KEY) || 'null');
    if (currentUser) {
         addLogEntry({ userId: currentUser.id, username: currentUser.username, action: 'LOGOUT', details: 'Usuário saiu do sistema.' });
    }
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
    
    addLogEntry({ userId: newUser.id, username: newUser.username, action: 'REGISTER_USER', details: 'Nova conta de usuário criada.' });

    return true;
  }, []);

  const getUsers = useCallback((): RegisteredUser[] => {
      return getRegisteredUsers();
  }, []);
  
  const addUser = useCallback((actor: User, newUser: Omit<RegisteredUser, 'id'>): boolean => {
      setAuthError(null);
      if (!isEmailValid(newUser.username)) {
          setAuthError('authErrorInvalidEmail');
          return false;
      }
       if (!newUser.password || newUser.password.length < 6) {
        setAuthError('authErrorPasswordLength');
        return false;
    }
      const users = getRegisteredUsers();
      if (users.some(u => u.username.toLowerCase() === newUser.username.toLowerCase())) {
          setAuthError('authErrorEmailExists');
          return false;
      }
      const userToAdd: RegisteredUser = {
          id: crypto.randomUUID(),
          ...newUser
      };
      setRegisteredUsers([...users, userToAdd]);
      addLogEntry({
          userId: actor.id,
          username: actor.username,
          action: 'ADMIN_CREATE_USER',
          details: `Criou o novo usuário ${userToAdd.username} com a permissão ${userToAdd.role}.`
      });
      return true;
  }, []);

  const updateUser = useCallback((actor: User, targetUserId: string, updates: Partial<Omit<RegisteredUser, 'id'>>): boolean => {
      if (targetUserId === 'admin-user') return false;
      setAuthError(null);
      const users = getRegisteredUsers();
      const userIndex = users.findIndex(u => u.id === targetUserId);

      if(userIndex === -1) return false;
      
      const targetUser = users[userIndex];
      const oldUsername = targetUser.username;
      const oldRole = targetUser.role;

      if (updates.username && updates.username !== oldUsername && users.some(u => u.username.toLowerCase() === updates.username?.toLowerCase())) {
          setAuthError('authErrorEmailExists');
          return false;
      }

      if (updates.password && updates.password.length < 6) {
          setAuthError('authErrorPasswordLength');
          return false;
      }
      
      // Filter out empty password updates
      if (updates.password === '') {
          delete updates.password;
      }

      const updatedUser = { ...targetUser, ...updates };
      users[userIndex] = updatedUser;
      setRegisteredUsers(users);

      const details: string[] = [];
      if (updates.username && updates.username !== oldUsername) {
          details.push(`e-mail de "${oldUsername}" para "${updates.username}"`);
      }
      if (updates.role && updates.role !== oldRole) {
          details.push(`permissão de "${oldRole}" para "${updates.role}"`);
      }
      if (updates.password) {
          details.push("redefiniu a senha");
      }

      if (details.length > 0) {
         addLogEntry({
            userId: actor.id,
            username: actor.username,
            action: 'ADMIN_UPDATE_USER',
            details: `Atualizou o usuário ${oldUsername}: ${details.join(', ')}.`
        });
      }

      return true;
  }, []);

  const deleteUser = useCallback((actor: User, targetUserId: string): boolean => {
      if (targetUserId === 'admin-user' || actor.id === targetUserId) {
          console.error("Deletion constraints violated.");
          return false;
      }

      const users = getRegisteredUsers();
      const userToDelete = users.find(u => u.id === targetUserId);
      if (!userToDelete) return false;

      const updatedUsers = users.filter(u => u.id !== targetUserId);
      setRegisteredUsers(updatedUsers);

      addLogEntry({
          userId: actor.id,
          username: actor.username,
          action: 'DELETE_USER',
          details: `Excluiu o usuário ${userToDelete.username}.`
      });

      return true;
  }, []);
  
  const getLogs = useCallback((): LogEntry[] => {
      return getLogsFromStorage();
  }, []);
  
  return { user, login, logout, register, authError, setAuthError, getUsers, addUser, updateUser, deleteUser, getLogs };
};