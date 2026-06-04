
CREATE TABLE IF NOT EXISTS public.competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  name text NOT NULL,
  domain text NOT NULL,
  url text NOT NULL,
  description text,
  source text NOT NULL DEFAULT 'firecrawl_search',
  last_scraped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, domain, query)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitors TO authenticated;
GRANT ALL ON public.competitors TO service_role;

ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own competitors all" ON public.competitors
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER competitors_updated_at BEFORE UPDATE ON public.competitors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.competitor_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competitor_id uuid NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  title text,
  price numeric,
  currency text,
  availability text,
  image_url text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  scraped_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_url)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitor_products TO authenticated;
GRANT ALL ON public.competitor_products TO service_role;

ALTER TABLE public.competitor_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own competitor_products all" ON public.competitor_products
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER competitor_products_updated_at BEFORE UPDATE ON public.competitor_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS competitors_user_idx ON public.competitors(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS competitor_products_user_idx ON public.competitor_products(user_id, competitor_id, scraped_at DESC);
