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
      if (storedUser) {
        const session = JSON.parse(storedUser);
        // Return only the user part, not the whole session with token
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
          // Logging is now handled by the backend, but we can keep a frontend log for logout
      } else {
          setAuthError('authErrorInvalidCredentials');
      }
    } catch (error) {
        console.error("Login API call failed:", error);
        setAuthError('genericErrorText');
    }
  }, []);

  const logout = useCallback(() => {
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
        role: 'user',
        companyId: undefined, // New users start without a company
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
      const oldCompanyId = targetUser.companyId;

      if (updates.username && updates.username !== oldUsername && users.some(u => u.username.toLowerCase() === updates.username?.toLowerCase())) {
          setAuthError('authErrorEmailExists');
          return false;
      }

      if (updates.password && updates.password.length < 6) {
          setAuthError('authErrorPasswordLength');
          return false;
      }
      
      if (updates.password === '') {
          delete updates.password;
      }

      const updatedUser = { ...targetUser, ...updates };
      if(updates.companyId === '') updatedUser.companyId = undefined;

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
      if ('companyId' in updates && updates.companyId !== oldCompanyId) {
          details.push(`alterou a empresa (ID: ${updates.companyId || 'Nenhuma'})`);
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