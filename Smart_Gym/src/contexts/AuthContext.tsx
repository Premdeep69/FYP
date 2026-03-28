import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, apiService } from '@/services/api';
import { socketService } from '@/services/socket';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, userType: 'user' | 'trainer' | 'admin', additionalData?: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        // Fetch fresh user data from server to get latest verification status
        try {
          const freshUser = await apiService.getCurrentUser();
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        } catch {
          setUser(JSON.parse(storedUser));
        }
        socketService.connect(storedToken);
      }
      
      setLoading(false);
    };

    initAuth();

    return () => {
      socketService.disconnect();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login({ email, password });
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setToken(response.token);
      setUser(response.user);
      
      // Connect to WebSocket
      socketService.connect(response.token);
    } catch (error) {
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string, userType: 'user' | 'trainer' | 'admin', additionalData?: any) => {
    try {
      const registrationPayload = additionalData || { name, email, password, userType };
      const response = await apiService.register(registrationPayload);
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setToken(response.token);
      setUser(response.user);
      
      // Connect to WebSocket
      socketService.connect(response.token);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    socketService.disconnect();
  };

  const refreshUser = async () => {
    try {
      const freshUser = await apiService.getCurrentUser();
      setUser(freshUser);
      localStorage.setItem('user', JSON.stringify(freshUser));
    } catch {
      // silently fail
    }
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    refreshUser,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};