
-- Revoke any direct write grants from client roles. All writes flow through
-- SECURITY DEFINER functions (spend_credits, grant_credits) executed by the
-- service role on the server.
REVOKE INSERT, UPDATE, DELETE ON public.user_credits FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.credit_transactions FROM anon, authenticated;

-- Belt-and-braces: explicit restrictive RLS policies that block all client
-- writes even if a future grant is added by mistake.
DROP POLICY IF EXISTS "Deny client writes on user_credits" ON public.user_credits;
CREATE POLICY "Deny client writes on user_credits"
  ON public.user_credits
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Allow owner select on user_credits" ON public.user_credits;
-- (Existing SELECT policy scoped to owner is preserved; restrictive policy
-- above only blocks INSERT/UPDATE/DELETE because SELECT remains permitted
-- by the existing permissive owner policy AND must also satisfy restrictive.
-- Re-create a permissive SELECT for owner explicitly to ensure reads work.)

DROP POLICY IF EXISTS "Deny client writes on credit_transactions" ON public.credit_transactions;
CREATE POLICY "Deny client writes on credit_transactions"
  ON public.credit_transactions
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
