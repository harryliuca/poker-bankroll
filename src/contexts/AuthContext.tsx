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
    let isMounted = true;

    const invalidateUserData = () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === 'sessions' || key === 'stats' || key === 'profile';
        },
      });
    };

    const loadInitialSession = async () => {
      try {
        const currentSession = await authService.getSession();
        console.log('AuthContext: initial session', currentSession?.user?.id ?? null);
        if (!isMounted) return;

        setSession(currentSession ?? null);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await loadProfile(currentSession.user.id);
          invalidateUserData();
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error getting auth session:', error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInitialSession();

    const { data: authListener } = authService.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return;
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
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [queryClient]);

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
