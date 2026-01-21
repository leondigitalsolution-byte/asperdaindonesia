
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../service/supabaseClient';
import { authService } from '../service/authService';
import { Profile } from '../types';

// Bypass TS error for Session/User if types are missing in environment
type Session = any;
type User = any;

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
  
  // Ref to prevent race conditions during rapid tab switching
  const checkingRef = useRef(false);

  // 1. Core Logic: Sign Out & Clean Up
  const signOut = async () => {
      try {
        await authService.logout();
      } catch (e) {
        console.warn("Logout warning:", e);
      } finally {
        // Clear Local State
        setProfile(null);
        setSession(null);
        setUser(null);
        setLoading(false);
        localStorage.clear(); // Hard clear to remove stale tokens
        
        // Force redirect to prevent lingering state
        if (window.location.hash !== '#/login') {
            window.location.href = '/#/login';
        }
      }
  };

  // 2. Fetch Profile Data
  const fetchProfile = async (userId: string) => {
    try {
      const data = await authService.getUserProfile();
      if (!data) {
          console.warn("Profile missing. User might be deleted or DB error.");
          throw new Error("Profile missing");
      }
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      // Don't sign out immediately on profile fetch error to allow retries,
      // unless the session itself is invalid (handled by authService returning null)
    }
  };

  const refreshProfile = async () => {
      if(user) await fetchProfile(user.id);
  };

  useEffect(() => {
    let mounted = true;

    // 3. Initialize Session on Mount
    const initializeAuth = async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;

      try {
        // Get session from local storage
        const { data, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (mounted) {
          if (data.session) {
            // Optimistically set session
            setSession(data.session);
            setUser(data.session.user);
            
            // Validate token with server
            const { data: { user: validUser }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !validUser) {
                console.warn("Token stale on init, attempting refresh...");
                // AUTOMATIC RECOVERY: Try to refresh the session using the Refresh Token
                const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                
                if (refreshError || !refreshData.session) {
                    console.error("Session recovery failed. User must login again.");
                    throw new Error("Session expired");
                } else {
                    console.log("Session recovered successfully.");
                    setSession(refreshData.session);
                    setUser(refreshData.session.user);
                    await fetchProfile(refreshData.session.user.id);
                }
            } else {
                // Token is valid
                await fetchProfile(data.session.user.id);
            }
          } else {
            // No session found
            setSession(null);
            setUser(null);
            setProfile(null);
          }
        }
      } catch (error) {
        console.error("Auth Init Error:", error);
        if (mounted) await signOut();
      } finally {
        if (mounted) {
            setLoading(false);
            checkingRef.current = false;
        }
      }
    };

    initializeAuth();

    // 4. Listener: Supabase Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      console.log(`Auth Event: ${event}`);

      if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user && (!profile || profile.id !== session.user.id)) {
             await fetchProfile(session.user.id);
          }
          setLoading(false);
      }
    });

    // 5. Listener: Window Focus (Wake up from sleep)
    // FIX: Auto-refresh session when tab becomes visible to prevent "Loading..." loop
    const handleFocus = async () => {
        if (document.visibilityState === 'visible' && session) {
            console.log("Tab woke up, refreshing session...");
            // Proactively refresh to ensure token is valid after sleep
            const { data, error } = await supabase.auth.refreshSession();
            
            if (error) {
                console.warn("Background refresh failed:", error.message);
                // Only sign out if refresh token is strictly invalid
                if (error.message.includes('refresh_token_not_found') || error.message.includes('Invalid refresh token')) {
                    await signOut();
                }
            } else if (data.session) {
                // Update session with fresh token
                setSession(data.session);
                setUser(data.session.user);
            }
        }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);

    return () => {
      mounted = false;
      if (subscription && subscription.unsubscribe) subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, [session]); // Keep session in dependency to allow refresh logic to check current state

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
