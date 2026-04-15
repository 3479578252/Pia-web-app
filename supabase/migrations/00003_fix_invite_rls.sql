-- Fix: invite validation and acceptance need to work for unauthenticated users
-- during signup. RLS blocks anon access to the invites table, so we use
-- SECURITY DEFINER functions that bypass RLS.

-- Validate an invite code (callable by anon users during signup)
CREATE OR REPLACE FUNCTION public.validate_invite_code(invite_code TEXT)
RETURNS TABLE(id UUID, email TEXT, role user_role) AS $$
  SELECT id, email, role
  FROM public.invites
  WHERE code = invite_code
    AND status = 'pending'
    AND expires_at > NOW();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Accept an invite after signup (callable by newly signed-up users)
CREATE OR REPLACE FUNCTION public.accept_invite(invite_code TEXT, user_uuid UUID)
RETURNS VOID AS $$
  UPDATE public.invites
  SET status = 'accepted', accepted_by = user_uuid
  WHERE code = invite_code
    AND status = 'pending';
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.validate_invite_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_invite_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invite(TEXT, UUID) TO authenticated;
