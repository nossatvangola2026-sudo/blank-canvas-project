import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  generateDeviceFingerprint, 
  getStoredFingerprint, 
  storeFingerprint 
} from '@/lib/deviceFingerprint';

interface FraudCheckResult {
  isFraud: boolean;
  reason: string | null;
}

export function useDeviceFingerprint() {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState<{
    userAgent: string;
    platform: string;
    screenResolution: string;
    timezone: string;
    language: string;
  } | null>(null);

  useEffect(() => {
    const initFingerprint = async () => {
      try {
        // Check for stored fingerprint first
        let storedFp = getStoredFingerprint();
        
        if (!storedFp) {
          // Generate new fingerprint
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
          // Get current device info
          const info = await generateDeviceFingerprint();
          setDeviceInfo({
            userAgent: info.userAgent,
            platform: info.platform,
            screenResolution: info.screenResolution,
            timezone: info.timezone,
            language: info.language,
          });
        }
        
        setFingerprint(storedFp);
      } catch (error) {
        console.error('Error generating fingerprint:', error);
        // Fallback to a random ID if fingerprinting fails
        const fallbackFp = crypto.randomUUID();
        storeFingerprint(fallbackFp);
        setFingerprint(fallbackFp);
      } finally {
        setIsLoading(false);
      }
    };

    initFingerprint();
  }, []);

  const checkFraud = useCallback(async (userId: string): Promise<FraudCheckResult> => {
    if (!fingerprint) {
      return { isFraud: false, reason: null };
    }

    try {
      const { data, error } = await supabase
        .rpc('check_device_fraud', {
          _fingerprint: fingerprint,
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
  }, [fingerprint]);

  const registerDevice = useCallback(async (userId: string): Promise<boolean> => {
    if (!fingerprint || !deviceInfo) {
      return false;
    }

    try {
      const { data, error } = await supabase
        .rpc('register_device', {
          _fingerprint: fingerprint,
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
  }, [fingerprint, deviceInfo]);

  return {
    fingerprint,
    deviceInfo,
    isLoading,
    checkFraud,
    registerDevice,
  };
}
