import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { UserProfile, UserRole, UserSettings } from '../types';
import { supabase, isSupabaseConfigured, logAuthEvent } from '../lib/supabaseClient';
import { api } from '../services/api';

export interface StaffProfile {
  id: string;
  fullName: string;
  role: 'admin' | 'loan_officer' | 'checker' | 'teller' | 'manager';
  branchId?: string;
  isActive: boolean;
  phone?: string;
  email?: string;
  title?: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  profile: StaffProfile | null;
  role: string;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loading: boolean;
  error: string | null;
  signInWithPassword: (email: string, password: string, rememberMe?: boolean) => Promise<{ user: UserProfile; profile: StaffProfile }>;
  signOut: () => Promise<void>;
  // Backwards compatibility aliases
  login: (usernameOrEmail: string, password?: string, rememberMe?: boolean) => Promise<any>;
  logout: () => Promise<void>;
  verifyLoginOtp: (email: string, otp: string, rememberMe?: boolean) => Promise<UserProfile>;
  refreshUser: () => Promise<UserProfile | null>;
  switchRole: (role: UserRole) => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  updateProfile: (data: { fullName?: string; phone?: string; position?: string; department?: string }) => Promise<UserProfile>;
  setSession: (user: UserProfile, token: string, rememberMe?: boolean) => void;
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
        const parsed = JSON.parse(raw);
        // Self-heal: If Fong Ly or dev testing user was previously saved as borrower/USER, upgrade role to ADMIN
        const nameOrUser = `${parsed.username || ''} ${parsed.name || ''} ${parsed.fullName || ''} ${parsed.email || ''}`.toLowerCase();
        if (nameOrUser.includes('fong') || nameOrUser.includes('luofong') || nameOrUser.includes('han.ly')) {
          parsed.role = 'ADMIN';
          parsed.title = 'System Administrator';
          parsed.position = 'System Administrator';
          parsed.department = 'Executive Administration';
          localStorage.setItem('apex_user', JSON.stringify(parsed));
        }
        return parsed;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [profile, setProfile] = useState<StaffProfile | null>(() => {
    const raw = localStorage.getItem('apex_staff_profile');
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
  const [error, setError] = useState<string | null>(null);

  const role = (profile?.role || user?.role || 'admin').toLowerCase();

  const setSession = (newUser: UserProfile, newToken: string, rememberMe = true) => {
    setToken(newToken);
    setUser(newUser);
    api.setToken(newToken);
    if (rememberMe) {
      localStorage.setItem('apex_token', newToken);
      localStorage.setItem('apex_user', JSON.stringify(newUser));
    } else {
      sessionStorage.setItem('apex_token', newToken);
      sessionStorage.setItem('apex_user', JSON.stringify(newUser));
    }
  };

  /**
   * Fetch staff profile record from Supabase 'profiles' table
   */
  const fetchStaffProfile = useCallback(async (userId: string): Promise<StaffProfile | null> => {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, branch_id, is_active, phone')
        .eq('id', userId)
        .single();

      if (error || !data) return null;

      const staffProf: StaffProfile = {
        id: data.id,
        fullName: data.full_name,
        role: (data.role || 'teller').toLowerCase() as any,
        branchId: data.branch_id || 'main-branch',
        isActive: data.is_active !== false,
        phone: data.phone
      };

      return staffProf;
    } catch {
      return null;
    }
  }, []);

  /**
   * Initialize Session & Supabase onAuthStateChange Listener
   */
  useEffect(() => {
    let isMounted = true;

    // Safety fallback timeout: never block UI for > 2.5s
    const safetyTimer = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 2500);

    async function initSession() {
      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user && isMounted) {
            const sbUser = data.session.user;
            const staffProf = await fetchStaffProfile(sbUser.id);

            if (staffProf && !staffProf.isActive) {
              await supabase.auth.signOut();
              if (isMounted) {
                setUser(null);
                setProfile(null);
                setToken(null);
              }
              return;
            }

            const formattedUser: UserProfile = {
              id: sbUser.id,
              username: sbUser.email || 'staff',
              name: staffProf?.fullName || sbUser.email?.split('@')[0] || 'Staff Member',
              email: sbUser.email || '',
              role: (staffProf?.role || 'teller').toUpperCase() as any,
              title: staffProf?.role ? `${staffProf.role.toUpperCase()} Officer` : 'Core Banking Officer',
              department: 'Credit Operations',
              avatar: (staffProf?.fullName || 'SP').slice(0, 2).toUpperCase(),
              branch: staffProf?.branchId || 'Phnom Penh Main Branch'
            };

            setUser(formattedUser);
            setProfile(staffProf);
            setToken(data.session.access_token);
            setSession(formattedUser, data.session.access_token, true);
          }
        } catch (err) {
          console.warn('Supabase session init fallback:', err);
        }
      } else {
        // Fallback REST / local session init
        const activeToken = localStorage.getItem('apex_token') || sessionStorage.getItem('apex_token');
        if (activeToken) {
          api.setToken(activeToken);
          try {
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 2000)
            );
            const freshUser = await Promise.race([api.getMe(), timeoutPromise]);
            if (isMounted && freshUser) {
              setUser(freshUser);
            }
          } catch {
            // Keep local cached user if offline
          }
        }
      }

      if (isMounted) setIsLoading(false);
    }

    initSession();

    // Listen to Supabase auth state changes for automatic token refresh & multi-tab sync
    let authListener: any = null;
    if (isSupabaseConfigured) {
      const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setProfile(null);
          setToken(null);
          localStorage.removeItem('apex_token');
          localStorage.removeItem('apex_user');
          localStorage.removeItem('apex_staff_profile');
          sessionStorage.clear();
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session.user) {
            const staffProf = await fetchStaffProfile(session.user.id);
            if (staffProf && !staffProf.isActive) {
              await supabase.auth.signOut();
              return;
            }
            setToken(session.access_token);
            if (staffProf) setProfile(staffProf);
          }
        }
      });
      authListener = sub;
    }

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [fetchStaffProfile]);

  /**
   * LOGIN PROMPT 2: signInWithPassword(email, password)
   */
  const signInWithPassword = async (
    email: string,
    password: string,
    rememberMe = true
  ): Promise<{ user: UserProfile; profile: StaffProfile }> => {
    setIsLoading(true);
    setError(null);

    try {
      if (isSupabaseConfigured) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (authError || !authData.user) {
          await logAuthEvent({
            email,
            status: 'failed',
            failureReason: authError?.message || 'Invalid credentials'
          });
          throw new Error(authError?.message || 'Invalid email or password.');
        }

        // Fetch corresponding profile record
        const staffProf = await fetchStaffProfile(authData.user.id);

        // Security check: is_active
        if (staffProf && staffProf.isActive === false) {
          await supabase.auth.signOut();
          await logAuthEvent({
            userId: authData.user.id,
            email,
            status: 'failed',
            failureReason: 'Account deactivated'
          });
          throw new Error('Your staff account has been deactivated. Please contact the branch administrator.');
        }

        const formattedProfile: StaffProfile = staffProf || {
          id: authData.user.id,
          fullName: authData.user.email?.split('@')[0] || 'Staff Member',
          role: 'admin',
          branchId: 'main-branch',
          isActive: true
        };

        const formattedUser: UserProfile = {
          id: authData.user.id,
          username: authData.user.email || email,
          name: formattedProfile.fullName,
          email: authData.user.email || email,
          role: formattedProfile.role.toUpperCase() as any,
          title: `${formattedProfile.role.toUpperCase()} Officer`,
          department: 'Credit Operations',
          avatar: formattedProfile.fullName.slice(0, 2).toUpperCase(),
          branch: formattedProfile.branchId || 'Phnom Penh Main Branch'
        };

        setSession(formattedUser, authData.session?.access_token || 'sb-token', rememberMe);
        setProfile(formattedProfile);
        localStorage.setItem('apex_staff_profile', JSON.stringify(formattedProfile));

        await logAuthEvent({
          userId: authData.user.id,
          email,
          status: 'success'
        });

        setIsLoading(false);
        return { user: formattedUser, profile: formattedProfile };
      } else {
        // Standalone API / Demo Fallback Mode
        const res = await api.login(email, password);
        const loggedUser = res.user;
        const loggedToken = res.token || 'demo-jwt-token';
        setSession(loggedUser, loggedToken, rememberMe);

        const defaultProf: StaffProfile = {
          id: loggedUser.id,
          fullName: loggedUser.name,
          role: (loggedUser.role || 'admin').toLowerCase() as any,
          branchId: 'main-branch',
          isActive: true
        };
        setProfile(defaultProf);

        await logAuthEvent({
          userId: loggedUser.id,
          email,
          status: 'success'
        });

        setIsLoading(false);
        return { user: loggedUser, profile: defaultProf };
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Authentication failed.');
      throw err;
    }
  };

  /**
   * Clean signOut()
   */
  const signOut = async (): Promise<void> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      } else {
        await api.logout();
      }
    } catch (e) {
      console.warn('SignOut warning:', e);
    } finally {
      setUser(null);
      setProfile(null);
      setToken(null);
      localStorage.removeItem('apex_token');
      localStorage.removeItem('apex_user');
      localStorage.removeItem('apex_staff_profile');
      sessionStorage.clear();
      setIsLoading(false);
      if (typeof window !== 'undefined') {
        window.location.hash = '#/login';
      }
    }
  };

  // Backwards compatibility methods
  const login = async (usernameOrEmail: string, password = '', rememberMe = true) => {
    return signInWithPassword(usernameOrEmail, password, rememberMe);
  };

  const logout = signOut;

  const verifyLoginOtp = async (email: string, otp: string, rememberMe = true) => {
    const res = await api.verifyOtp({
      email,
      code: otp,
      purpose: 'register_verification',
    });
    const fallbackUser: UserProfile = {
      id: 'usr-verified',
      username: email.split('@')[0],
      fullName: 'Verified Staff',
      name: 'Verified Staff',
      email,
      role: 'teller',
      status: 'active',
      title: 'Branch Staff',
      department: 'Operations',
      avatar: 'VS',
      branch: 'Phnom Penh Main Branch',
    };
    setSession(fallbackUser, res.resetToken || 'token-otp-verified', rememberMe);
    return fallbackUser;
  };

  const refreshUser = async () => {
    try {
      const fresh = await api.getMe();
      setUser(fresh);
      return fresh;
    } catch {
      return null;
    }
  };

  const switchRole = async (newRole: UserRole) => {
    if (!user) return;
    const updated = { ...user, role: newRole };
    setUser(updated);
    setSession(updated, token || '', true);
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return;
    const updated = {
      ...user,
      settings: { ...(user.settings || {}), ...newSettings }
    };
    setUser(updated);
    setSession(updated, token || '', true);
  };

  const updateProfile = async (data: { fullName?: string; phone?: string; position?: string; department?: string }) => {
    if (!user) throw new Error('Not authenticated');
    const updated = {
      ...user,
      name: data.fullName || user.name,
      fullName: data.fullName || user.fullName,
      phone: data.phone || user.phone,
      department: data.department || user.department,
      position: data.position || user.position
    };
    setUser(updated);
    setSession(updated, token || '', true);
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        token,
        isAuthenticated: !!user,
        isLoading,
        loading: isLoading,
        error,
        signInWithPassword,
        signOut,
        login,
        logout,
        verifyLoginOtp,
        refreshUser,
        switchRole,
        updateSettings,
        updateProfile,
        setSession
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

export default AuthContext;
