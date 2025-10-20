import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '@/services/auth';
import { profileService } from '@/services/profiles';
import type { Profile } from '@/types/database';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    try {
      const userProfile = await profileService.getProfile(userId);
      setProfile(userProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await loadProfile(user.id);
    }
  };

  useEffect(() => {
    // Check for existing session
    let cancelled = false;
    const failSafeTimeout = setTimeout(() => {
      if (!cancelled) {
        console.warn('Auth session request timed out, showing login screen');
        setLoading(false);
      }
    }, 5000);

    authService
      .getSession()
      .then((currentSession) => {
        if (cancelled) return;
        console.log('AuthContext: initial session', currentSession?.user?.id ?? null);
        setSession(currentSession);
        if (currentSession?.user) {
          setUser(currentSession.user);
          loadProfile(currentSession.user.id);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Error getting auth session:', error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          clearTimeout(failSafeTimeout);
          setLoading(false);
        }
      });

    // Listen for auth changes
    const { data: authListener } = authService.onAuthStateChange(
      async (event, currentSession) => {
        console.log('AuthContext: auth state change', event, currentSession?.user?.id ?? null);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await loadProfile(currentSession.user.id);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      clearTimeout(failSafeTimeout);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { session: newSession, user: newUser } = await authService.signIn(email, password);
    console.log('AuthContext: signIn result', newUser?.id ?? null);
    setSession(newSession);
    setUser(newUser);
    if (newUser) {
      await loadProfile(newUser.id);
    }
  };

  const signUp = async (email: string, password: string) => {
    const { session: newSession, user: newUser } = await authService.signUp(email, password);
    console.log('AuthContext: signUp result', newUser?.id ?? null);
    setSession(newSession);
    setUser(newUser);
    if (newUser) {
      await loadProfile(newUser.id);
    }
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
