
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../service/supabaseClient';
import { authService } from '../service/authService';
import { Profile } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // 1. Get Initial Session with Timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Session timeout')), 5000));
        
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        if (error) throw error;

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await fetchProfile(session.user.id);
          }
        }
      } catch (error) {
        console.error("Auth Initialization Error:", error);
        // Force clear on error
        if (mounted) {
            // Non-blocking sign out attempt
            supabase.auth.signOut().catch(console.error);
            setSession(null);
            setUser(null);
            setProfile(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // 2. Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth State Change:", event);
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Only fetch if profile is missing or user changed
        if (!profile || profile.id !== session.user.id) {
            await fetchProfile(session.user.id);
        }
      } else {
        setProfile(null);
      }
      
      // CRITICAL FIX: Always disable loading after an auth event is processed
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      // Add timeout to profile fetch
      const profilePromise = authService.getUserProfile();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Profile fetch timeout')), 5000));
      
      const data = await Promise.race([profilePromise, timeoutPromise]) as Profile;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      // Don't throw here, allow app to load even if profile fails
    }
  };

  const refreshProfile = async () => {
      if(user) await fetchProfile(user.id);
  };

  const signOut = async () => {
      setLoading(true);
      try {
        await authService.logout();
      } catch (e) {
        console.error("Logout Error", e);
      } finally {
        setProfile(null);
        setSession(null);
        setUser(null);
        setLoading(false);
        // Force reload to clear any memory states
        window.location.href = '/';
      }
  };

  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'dpc_admin';
  const isOwner = profile?.role === 'owner' || isAdmin;

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, isAdmin, isOwner, refreshProfile, signOut }}>
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
