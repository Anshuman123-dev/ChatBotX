import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    const guestMode = localStorage.getItem('guest_mode');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setIsGuest(false);
    } else if (guestMode === 'true') {
      setIsGuest(true);
    }
    setLoading(false);
  }, []);

  const login = async (userData, authToken) => {
    setToken(authToken);
    setUser(userData);
    setIsGuest(false);
    localStorage.setItem('auth_token', authToken);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    localStorage.removeItem('guest_mode');
  };

  const register = async (userData, authToken) => {
    setToken(authToken);
    setUser(userData);
    setIsGuest(false);
    localStorage.setItem('auth_token', authToken);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    localStorage.removeItem('guest_mode');
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    localStorage.setItem('guest_mode', 'true');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsGuest(false);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('guest_mode');
  };

  const value = {
    user,
    token,
    isGuest,
    loading,
    login,
    register,
    logout,
    continueAsGuest,
    isAuthenticated: !!token,
    hasChosenMode: isGuest || !!token
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
