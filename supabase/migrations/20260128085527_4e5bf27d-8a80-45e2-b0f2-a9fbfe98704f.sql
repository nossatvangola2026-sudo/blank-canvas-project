-- Create table to store device fingerprints
CREATE TABLE public.device_fingerprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    fingerprint TEXT NOT NULL,
    user_agent TEXT,
    platform TEXT,
    screen_resolution TEXT,
    timezone TEXT,
    language TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_blocked BOOLEAN NOT NULL DEFAULT false,
    block_reason TEXT,
    UNIQUE(fingerprint)
);

-- Create index for faster lookups
CREATE INDEX idx_device_fingerprints_fingerprint ON public.device_fingerprints(fingerprint);
CREATE INDEX idx_device_fingerprints_user_id ON public.device_fingerprints(user_id);

-- Enable RLS
ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can view all, users can only insert their own
CREATE POLICY "Users can insert own device" 
ON public.device_fingerprints 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own devices" 
ON public.device_fingerprints 
FOR SELECT 
USING ((user_id = auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "Admins can update devices" 
ON public.device_fingerprints 
FOR UPDATE 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete devices" 
ON public.device_fingerprints 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Function to check if device is already registered to another user
CREATE OR REPLACE FUNCTION public.check_device_fraud(
    _fingerprint TEXT,
    _user_id UUID
)
RETURNS TABLE(
    is_fraud BOOLEAN,
    existing_user_id UUID,
    reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN df.user_id IS NOT NULL AND df.user_id != _user_id THEN true
            WHEN df.is_blocked THEN true
            ELSE false
        END as is_fraud,
        df.user_id as existing_user_id,
        CASE 
            WHEN df.is_blocked THEN 'Dispositivo bloqueado: ' || COALESCE(df.block_reason, 'Violação de termos')
            WHEN df.user_id IS NOT NULL AND df.user_id != _user_id THEN 'Dispositivo já registrado em outra conta'
            ELSE NULL
        END as reason
    FROM public.device_fingerprints df
    WHERE df.fingerprint = _fingerprint
    LIMIT 1;
    
    -- If no rows returned, device is new (not fraud)
    IF NOT FOUND THEN
        RETURN QUERY SELECT false::boolean, NULL::uuid, NULL::text;
    END IF;
END;
$$;

-- Function to register or update device
CREATE OR REPLACE FUNCTION public.register_device(
    _fingerprint TEXT,
    _user_id UUID,
    _user_agent TEXT DEFAULT NULL,
    _platform TEXT DEFAULT NULL,
    _screen_resolution TEXT DEFAULT NULL,
    _timezone TEXT DEFAULT NULL,
    _language TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    existing_device RECORD;
BEGIN
    -- Check if device exists
    SELECT * INTO existing_device 
    FROM public.device_fingerprints 
    WHERE fingerprint = _fingerprint;
    
    IF existing_device IS NOT NULL THEN
        -- Device exists, check if same user
        IF existing_device.user_id = _user_id THEN
            -- Update last seen
            UPDATE public.device_fingerprints 
            SET last_seen_at = now(),
                user_agent = COALESCE(_user_agent, user_agent),
                platform = COALESCE(_platform, platform)
            WHERE fingerprint = _fingerprint;
            RETURN true;
        ELSE
            -- Different user trying to use same device - FRAUD
            RETURN false;
        END IF;
    ELSE
        -- New device, register it
        INSERT INTO public.device_fingerprints (
            user_id, fingerprint, user_agent, platform, 
            screen_resolution, timezone, language
        ) VALUES (
            _user_id, _fingerprint, _user_agent, _platform,
            _screen_resolution, _timezone, _language
        );
        RETURN true;
    END IF;
END;
$$;

-- Add suspicious_activity column to profiles for flagging
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS suspicious_activity BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fraud_flags INTEGER DEFAULT 0;