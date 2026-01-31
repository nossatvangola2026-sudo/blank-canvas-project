-- Add unique constraint on user_id to allow ON CONFLICT to work
-- This ensures each user can only have one role
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- Recreate the promote_to_admin function with the constraint now in place
CREATE OR REPLACE FUNCTION public.promote_to_admin(_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _user_id uuid;
BEGIN
    -- Get user_id from auth.users by email
    SELECT id INTO _user_id FROM auth.users WHERE email = _email;
    
    IF _user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', _email;
    END IF;
    
    -- Update existing role or insert new one
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'admin')
    ON CONFLICT (user_id) 
    DO UPDATE SET role = 'admin';
    
    RETURN true;
END;
$$;