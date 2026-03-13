import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  role: 'user' | 'admin';
  can_edit_status?: boolean;
  can_edit_room?: boolean;
  can_view_ratings?: boolean;
  created_at?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  debugLog: string[];
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  debugLog: [],
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [debugLog, setDebugLog] = useState<string[]>(['Init']);

  const addLog = (msg: string) => {
    setDebugLog(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${msg}`]);
  };

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      addLog('getSession start');
      setIsLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        addLog(`getSession error: ${error.message}`);
      }
      
      setSession(session);
      setUser(session?.user || null);
      
      if (session?.user) {
        addLog(`getSession found user: ${session.user.id}`);
        await fetchProfile(session.user.id);
      } else {
        addLog('getSession no user, isLoading false');
        setIsLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        addLog(`onAuthStateChange event: ${event}`);
        setSession(session);
        setUser(session?.user || null);
        
        if (session?.user) {
          addLog(`onAuthStateChange calling fetchProfile`);
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setIsLoading(false);
          addLog(`onAuthStateChange no user`);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    let retries = 3;
    let foundProfile = null;
    addLog(`fetchProfile start for ${userId}`);

    try {
      while (retries > 0 && !foundProfile) {
        addLog(`fetchProfile query run (${retries} retries left)`);
        
        // Add a manual timeout race to the supabase fetch since it might be hanging indefinitely
        const fetchPromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase network timeout')), 1000));
        
        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
          
        if (error && error.code !== 'PGRST116') {
          addLog(`fetchProfile error: ${error.message} (${error.code})`);
        } else if (error && error.code === 'PGRST116') {
          addLog(`fetchProfile PGRST116 (No profile yet)`);
        }
        
        if (data) {
          addLog(`fetchProfile found data`);
          foundProfile = data;
          break;
        }
        
        addLog(`fetchProfile waiting 500ms...`);
        retries--;
        if (retries > 0) {
           await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      if (foundProfile) {
        addLog(`setProfile called`);
        setProfile(foundProfile as Profile);
      } else {
        addLog(`fetchProfile exhausted all retries without data`);
      }
    } catch (e: any) {
      addLog(`fetchProfile exception: ${e.message}`);
    } finally {
      addLog(`fetchProfile finally: setting isLoading false`);
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    // state clears in onAuthStateChange
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isLoading, debugLog, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
