import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, UserRole, UserSettings } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (usernameOrEmail: string, password?: string, rememberMe?: boolean, roleOverride?: UserRole) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<UserProfile | null>;
  switchRole: (role: UserRole) => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('apex_token') || sessionStorage.getItem('apex_token');
  });

  const [user, setUser] = useState<UserProfile | null>(() => {
    const raw = localStorage.getItem('apex_user') || sessionStorage.getItem('apex_user');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session & fetch fresh user profile from DB on mount
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      const activeToken = localStorage.getItem('apex_token') || sessionStorage.getItem('apex_token');
      if (!activeToken) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      api.setToken(activeToken);

      try {
        const freshUser = await api.getMe();
        if (isMounted) {
          setUser(freshUser);
          setToken(activeToken);
          // Update cached user in storage
          if (localStorage.getItem('apex_token')) {
            localStorage.setItem('apex_user', JSON.stringify(freshUser));
          } else {
            sessionStorage.setItem('apex_user', JSON.stringify(freshUser));
          }
        }
      } catch (err) {
        console.warn('Session expired or could not verify credentials, resetting:', err);
        if (isMounted) {
          api.setToken(null);
          setToken(null);
          setUser(null);
          localStorage.removeItem('apex_token');
          localStorage.removeItem('apex_user');
          sessionStorage.removeItem('apex_token');
          sessionStorage.removeItem('apex_user');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (
    usernameOrEmail: string,
    password = 'Password123!',
    rememberMe = true,
    roleOverride?: UserRole
  ): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const result = await api.login(usernameOrEmail, password, rememberMe, roleOverride);
      setToken(result.token);
      setUser(result.user);

      if (rememberMe) {
        localStorage.setItem('apex_token', result.token);
        localStorage.setItem('apex_user', JSON.stringify(result.user));
      } else {
        sessionStorage.setItem('apex_token', result.token);
        sessionStorage.setItem('apex_user', JSON.stringify(result.user));
      }

      return result.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.logout();
    } finally {
      setToken(null);
      setUser(null);
      api.setToken(null);
      localStorage.removeItem('apex_token');
      localStorage.removeItem('apex_user');
      sessionStorage.removeItem('apex_token');
      sessionStorage.removeItem('apex_user');
      setIsLoading(false);
    }
  };

  const refreshUser = async (): Promise<UserProfile | null> => {
    try {
      const updated = await api.getMe();
      setUser(updated);
      if (localStorage.getItem('apex_token')) {
        localStorage.setItem('apex_user', JSON.stringify(updated));
      } else {
        sessionStorage.setItem('apex_user', JSON.stringify(updated));
      }
      return updated;
    } catch {
      return null;
    }
  };

  const switchRole = async (role: UserRole) => {
    if (!user) return;
    const updated = {
      ...user,
      role,
      title: role === 'MANAGER' ? 'Executive Branch Manager' : role === 'CASHIER' ? 'Desk Cashier' : role === 'LOAN_OFFICER' ? 'Senior Underwriter' : 'Retail Client',
    };
    setUser(updated);
    if (localStorage.getItem('apex_token')) {
      localStorage.setItem('apex_user', JSON.stringify(updated));
    } else {
      sessionStorage.setItem('apex_user', JSON.stringify(updated));
    }
  };

  const updateSettings = async (settings: Partial<UserSettings>) => {
    try {
      const updated = await api.updateUserSettings(settings);
      if (user && updated.branch) {
        const updatedUser = { ...user, branch: updated.branch };
        setUser(updatedUser);
      }
    } catch (err) {
      console.warn('Failed to update settings via API:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        refreshUser,
        switchRole,
        updateSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
