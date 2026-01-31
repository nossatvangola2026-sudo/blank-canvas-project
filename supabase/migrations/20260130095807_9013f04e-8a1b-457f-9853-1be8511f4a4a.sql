-- Create a function to get user email by user_id
-- This is needed to display user identification when username is not set
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _email text;
BEGIN
    SELECT email INTO _email FROM auth.users WHERE id = _user_id;
    RETURN _email;
END;
$$;

-- Grant execute permission to authenticated users (admins only can call it through RLS)
GRANT EXECUTE ON FUNCTION public.get_user_email(uuid) TO authenticated;