
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
  
  const mountedRef = useRef(false);
  const profileCache = useRef<{ id: string, data: Profile } | null>(null);

  // 1. Core Logic: Sign Out
  const signOut = async () => {
      try {
        await authService.logout();
      } catch (e) {
        console.warn("Logout warning:", e);
      } finally {
        if (mountedRef.current) {
            setProfile(null);
            setSession(null);
            setUser(null);
            profileCache.current = null;
        }
        localStorage.clear(); 
        window.location.href = '/#/login';
      }
  };

  // 2. Fetch Profile Data
  const fetchProfile = async (userId: string, forceRefresh = false) => {
    try {
      // Jika data sudah ada di cache & ID sama, pakai cache saja (Instant)
      if (!forceRefresh && profileCache.current?.id === userId && profileCache.current?.data) {
          if (!profile && mountedRef.current) {
              setProfile(profileCache.current.data);
          }
          return;
      }

      const data = await authService.getUserProfile();
      
      if (mountedRef.current && data) {
          setProfile(data);
          profileCache.current = { id: userId, data: data };
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const refreshProfile = async () => {
      if(user) await fetchProfile(user.id, true);
  };

  useEffect(() => {
    mountedRef.current = true;

    const initializeAuth = async () => {
      try {
        // Cek sesi lokal (Sangat Cepat)
        const { data: { session: localSession } } = await supabase.auth.getSession();

        if (localSession) {
          setSession(localSession);
          setUser(localSession.user);
          // Initial load wajib fetch profile untuk cek Role
          await fetchProfile(localSession.user.id, false);
        }
      } catch (error) {
        console.error("Auth Init Error:", error);
        await signOut();
      } finally {
        if (mountedRef.current) {
            setLoading(false);
        }
      }
    };

    initializeAuth();

    // 4. Listener: Supabase Auth State Changes (Optimized)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mountedRef.current) return;
      
      if (event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          profileCache.current = null;
          setLoading(false);
      } 
      else if (event === 'TOKEN_REFRESHED') {
          // SILENT REFRESH: Hanya update token di memory.
          // JANGAN panggil DB, JANGAN set loading. User tidak akan merasakan apa-apa.
          console.log("Token refreshed silently.");
          setSession(newSession);
          setUser(newSession?.user ?? null);
      }
      else if (event === 'SIGNED_IN') {
          // Login beneran, perlu ambil data profile
          setSession(newSession);
          setUser(newSession?.user ?? null);
          
          if (newSession?.user) {
             await fetchProfile(newSession.user.id, false);
          }
          setLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      if (subscription && subscription.unsubscribe) subscription.unsubscribe();
    };
  }, []); 

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
