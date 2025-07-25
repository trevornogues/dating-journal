import React, { createContext, useState, useContext, useEffect } from 'react';
import { StorageService } from './storage';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await StorageService.getUser();
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    // In a real app, you would validate credentials with a backend
    // For now, we'll create a mock user
    const userData = {
      id: Date.now().toString(),
      email,
      name: email.split('@')[0],
      createdAt: new Date().toISOString(),
    };

    await StorageService.saveUser(userData);
    setUser(userData);
    return true;
  };

  const signup = async (email, password, name) => {
    // In a real app, you would create an account on the backend
    // For now, we'll create a mock user
    const userData = {
      id: Date.now().toString(),
      email,
      name,
      createdAt: new Date().toISOString(),
    };

    await StorageService.saveUser(userData);
    setUser(userData);
    return true;
  };

  const logout = async () => {
    await StorageService.removeUser();
    await StorageService.clearAllData();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 