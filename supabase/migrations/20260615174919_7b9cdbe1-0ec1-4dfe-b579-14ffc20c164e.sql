
-- Tighten security on profiles.byok_gemini_key and clean up knowledge_documents.
-- 1. Add explicit DELETE policy on profiles so owners can remove their row/key.
CREATE POLICY "own profile delete" ON public.profiles
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. knowledge_documents.user_id should never be null (RLS uses it).
--    Backfill any null rows to a sentinel via delete (they are orphaned anyway),
--    then enforce NOT NULL.
DELETE FROM public.knowledge_documents WHERE user_id IS NULL;
ALTER TABLE public.knowledge_documents ALTER COLUMN user_id SET NOT NULL;
