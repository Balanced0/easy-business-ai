
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS byok_gemini_key text;
-- Existing GRANT SELECT/INSERT/UPDATE/DELETE on public.profiles TO authenticated
-- + RLS policy (auth.uid() = user_id) already restricts every row to its owner,
-- so the new column is automatically protected.
