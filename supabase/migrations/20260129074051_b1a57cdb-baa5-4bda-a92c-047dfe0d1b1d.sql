-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

-- Create cleaner RLS policies for user_roles
-- Allow users to view their own roles (needed for auth check)
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Allow admins to view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Allow admins to manage (insert/update/delete) roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.is_admin(auth.uid()));

-- Create a function to promote a user to admin (useful for initial setup)
-- This should be called from the Supabase SQL editor for the first admin
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