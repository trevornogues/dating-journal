import React, { createContext, useState, useContext, useEffect } from 'react';
import { FirebaseAuthService } from '../services/firebaseAuth';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen to authentication state changes
    const unsubscribe = FirebaseAuthService.onAuthStateChanged((user) => {
      setUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    const result = await FirebaseAuthService.login(email, password);
    if (result.success) {
      setUser(result.user);
      return { success: true };
    } else {
      console.error('Login failed:', result.error);
      return { success: false, error: result.error };
    }
  };

  const signup = async (email, password, name) => {
    const result = await FirebaseAuthService.signup(email, password, name);
    if (result.success) {
      setUser(result.user);
      return { success: true };
    } else {
      console.error('Signup failed:', result.error);
      return { success: false, error: result.error };
    }
  };

  const logout = async () => {
    const result = await FirebaseAuthService.logout();
    if (result.success) {
      setUser(null);
      return true;
    } else {
      console.error('Logout failed:', result.error);
      return false;
    }
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