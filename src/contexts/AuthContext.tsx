import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

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
    const invalidateUserData = () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === 'sessions' || key === 'stats' || key === 'profile';
        },
      });
    };

    const withTimeout = async <T,>(
      promise: Promise<T>,
      label: string,
      ms: number
    ): Promise<T> => {
      let timeoutId: ReturnType<typeof setTimeout>;
      return Promise.race([
        promise.finally(() => clearTimeout(timeoutId)),
        new Promise<T>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
        }),
      ]);
    };

    // Check for existing session
    let cancelled = false;
    const loadInitialSession = async () => {
      try {
        const { session: initialSession } = await withTimeout(
          authService.getSession(),
          'getSession',
          4000
        );
        console.log('AuthContext: initial session', initialSession?.user?.id ?? null);
        setSession(initialSession ?? null);
        if (initialSession?.user) {
          setUser(initialSession.user);
          await loadProfile(initialSession.user.id);
          invalidateUserData();
          return;
        }

        // Attempt refresh if no session found
        const { session: refreshedSession } = await withTimeout(
          authService.refreshSession(),
          'refreshSession',
          6000
        );
        console.log('AuthContext: refreshed session', refreshedSession?.user?.id ?? null);
        setSession(refreshedSession ?? null);
        if (refreshedSession?.user) {
          setUser(refreshedSession.user);
          await loadProfile(refreshedSession.user.id);
          invalidateUserData();
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error getting auth session:', error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadInitialSession();

    // Listen for auth changes
    const { data: authListener } = authService.onAuthStateChange(
      async (event, currentSession) => {
        console.log('AuthContext: auth state change', event, currentSession?.user?.id ?? null);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await loadProfile(currentSession.user.id);
          invalidateUserData();
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
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
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === 'sessions' || key === 'stats' || key === 'profile';
        },
      });
    }
  };

  const signUp = async (email: string, password: string) => {
    const { session: newSession, user: newUser } = await authService.signUp(email, password);
    console.log('AuthContext: signUp result', newUser?.id ?? null);
    setSession(newSession);
    setUser(newUser);
    if (newUser) {
      await loadProfile(newUser.id);
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === 'sessions' || key === 'stats' || key === 'profile';
        },
      });
    }
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return key === 'sessions' || key === 'stats' || key === 'profile';
      },
    });
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
