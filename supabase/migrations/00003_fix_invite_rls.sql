-- Fix: move invite validation into the handle_new_user() trigger.
-- The trigger already runs as SECURITY DEFINER (it must, to insert into
-- profiles). This avoids needing separate RLS-bypassing functions or
-- anon access to the invites table.
--
-- Flow:
--   1. Signup passes invite_code in user metadata
--   2. Trigger reads it from raw_user_meta_data->>'invite_code'
--   3. If valid (pending, not expired): assigns role from invite, marks accepted
--   4. If invalid or missing (and not first user): profile created with no role

-- Drop the old SECURITY DEFINER helper functions if they exist
DROP FUNCTION IF EXISTS public.validate_invite_code(TEXT);
DROP FUNCTION IF EXISTS public.accept_invite(TEXT, UUID);

-- Replace the handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_count INTEGER;
  assigned_role user_role;
  invite_code TEXT;
  invite_row RECORD;
  is_onboarded BOOLEAN;
BEGIN
  -- Count existing profiles to determine if this is the first user
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  -- Read invite code from signup metadata
  invite_code := NEW.raw_user_meta_data->>'invite_code';

  IF user_count = 0 THEN
    -- First user becomes privacy officer, auto-onboarded
    assigned_role := 'privacy_officer';
    is_onboarded := TRUE;
  ELSIF invite_code IS NOT NULL AND invite_code <> '' THEN
    -- Try to validate the invite code
    SELECT id, role INTO invite_row
    FROM public.invites
    WHERE code = invite_code
      AND status = 'pending'
      AND expires_at > NOW();

    IF invite_row.id IS NOT NULL THEN
      -- Valid invite: assign the role from the invite
      assigned_role := invite_row.role;
      is_onboarded := FALSE;
    ELSE
      -- Invalid or expired code: create with no role
      assigned_role := NULL;
      is_onboarded := FALSE;
    END IF;
  ELSE
    -- No invite code and not first user: no role
    assigned_role := NULL;
    is_onboarded := FALSE;
  END IF;

  -- Insert profile first (must exist before invites.accepted_by can reference it)
  INSERT INTO public.profiles (id, email, display_name, role, onboarding_complete)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    assigned_role,
    is_onboarded
  );

  -- Mark invite as accepted after profile exists (accepted_by FK references profiles.id)
  IF invite_row.id IS NOT NULL THEN
    UPDATE public.invites
    SET status = 'accepted', accepted_by = NEW.id
    WHERE id = invite_row.id;
  END IF;

  RETURN NEW;
END;
$$;
