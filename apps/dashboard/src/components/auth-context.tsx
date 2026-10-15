'use client';

import * as React from 'react';
import { apiClient, type User } from '@/lib/api';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  projects: any[];
  sendOtp: (email: string) => Promise<{ success: boolean; message: string; debugCode?: string }>;
  loginWithOtp: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [projects, setProjects] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const refreshUser = React.useCallback(async () => {
    try {
      const token = apiClient.getSessionToken();
      if (!token) {
        setUser(null);
        setProjects([]);
        setIsLoading(false);
        return;
      }

      const res = await apiClient.getMe();
      if (res.authenticated && res.user) {
        setUser(res.user);
        setProjects(res.projects || []);
      } else {
        setUser(null);
        setProjects([]);
      }
    } catch {
      setUser(null);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const sendOtp = async (email: string) => {
    return apiClient.sendOtp(email);
  };

  const loginWithOtp = async (email: string, code: string) => {
    const res = await apiClient.verifyOtp(email, code);
    if (res.user) {
      setUser(res.user);
      setProjects(res.projects || []);
    }
  };

  const logout = async () => {
    await apiClient.logout();
    setUser(null);
    setProjects([]);
    if (typeof window !== 'undefined') {
      window.location.assign('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        projects,
        sendOtp,
        loginWithOtp,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
