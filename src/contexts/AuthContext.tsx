import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { 
  generateDeviceFingerprint, 
  getStoredFingerprint, 
  storeFingerprint 
} from '@/lib/deviceFingerprint';

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  balance: number;
  phone: string | null;
}

interface DeviceFraudResult {
  isFraud: boolean;
  reason: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  deviceFingerprint: string | null;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null; fraudDetected?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; fraudDetected?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  checkDeviceFraud: (userId: string) => Promise<DeviceFraudResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<{
    userAgent: string;
    platform: string;
    screenResolution: string;
    timezone: string;
    language: string;
  } | null>(null);

  // Initialize device fingerprint
  useEffect(() => {
    const initFingerprint = async () => {
      try {
        let storedFp = getStoredFingerprint();
        
        if (!storedFp) {
          const info = await generateDeviceFingerprint();
          storedFp = info.fingerprint;
          storeFingerprint(storedFp);
          setDeviceInfo({
            userAgent: info.userAgent,
            platform: info.platform,
            screenResolution: info.screenResolution,
            timezone: info.timezone,
            language: info.language,
          });
        } else {
          const info = await generateDeviceFingerprint();
          setDeviceInfo({
            userAgent: info.userAgent,
            platform: info.platform,
            screenResolution: info.screenResolution,
            timezone: info.timezone,
            language: info.language,
          });
        }
        
        setDeviceFingerprint(storedFp);
      } catch (error) {
        console.error('Error generating fingerprint:', error);
        const fallbackFp = crypto.randomUUID();
        storeFingerprint(fallbackFp);
        setDeviceFingerprint(fallbackFp);
      }
    };

    initFingerprint();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (profileData) {
        setProfile({
          id: profileData.id,
          username: profileData.username,
          avatar_url: profileData.avatar_url,
          balance: Number(profileData.balance),
          phone: profileData.phone,
        });
      }

      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      setIsAdmin(roleData?.role === 'admin');
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid potential race conditions
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkDeviceFraud = async (userId: string): Promise<DeviceFraudResult> => {
    if (!deviceFingerprint) {
      return { isFraud: false, reason: null };
    }

    try {
      const { data, error } = await supabase
        .rpc('check_device_fraud', {
          _fingerprint: deviceFingerprint,
          _user_id: userId
        });

      if (error) {
        console.error('Error checking fraud:', error);
        return { isFraud: false, reason: null };
      }

      if (data && data.length > 0) {
        return {
          isFraud: data[0].is_fraud,
          reason: data[0].reason
        };
      }

      return { isFraud: false, reason: null };
    } catch (error) {
      console.error('Error in fraud check:', error);
      return { isFraud: false, reason: null };
    }
  };

  const registerDevice = async (userId: string): Promise<boolean> => {
    if (!deviceFingerprint || !deviceInfo) {
      return false;
    }

    try {
      const { data, error } = await supabase
        .rpc('register_device', {
          _fingerprint: deviceFingerprint,
          _user_id: userId,
          _user_agent: deviceInfo.userAgent,
          _platform: deviceInfo.platform,
          _screen_resolution: deviceInfo.screenResolution,
          _timezone: deviceInfo.timezone,
          _language: deviceInfo.language
        });

      if (error) {
        console.error('Error registering device:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error in device registration:', error);
      return false;
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      // First check if this device is already registered to another user
      // We can't check before signup since we don't have a user_id yet
      // The check will happen after successful signup
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        return { error, fraudDetected: false };
      }

      // If signup successful, check for device fraud
      if (data.user && deviceFingerprint) {
        const fraudCheck = await checkDeviceFraud(data.user.id);
        
        if (fraudCheck.isFraud) {
          // Sign out the fraudulent user
          await supabase.auth.signOut();
          return { 
            error: new Error(fraudCheck.reason || 'Dispositivo já registrado em outra conta'), 
            fraudDetected: true 
          };
        }

        // Register this device for the new user
        await registerDevice(data.user.id);
      }

      return { error: null, fraudDetected: false };
    } catch (error) {
      return { error: error as Error, fraudDetected: false };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error, fraudDetected: false };
      }

      // Check for device fraud after successful login
      if (data.user && deviceFingerprint) {
        const fraudCheck = await checkDeviceFraud(data.user.id);
        
        if (fraudCheck.isFraud) {
          // Sign out the fraudulent user
          await supabase.auth.signOut();
          return { 
            error: new Error(fraudCheck.reason || 'Dispositivo bloqueado ou já associado a outra conta'), 
            fraudDetected: true 
          };
        }

        // Update device last seen or register if new device for this user
        await registerDevice(data.user.id);
      }

      return { error: null, fraudDetected: false };
    } catch (error) {
      return { error: error as Error, fraudDetected: false };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        isLoading,
        deviceFingerprint,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        checkDeviceFraud,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};