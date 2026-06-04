
-- SALES
CREATE TABLE public.sales_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  batch_id uuid,
  sale_date date,
  sku text,
  product_name text,
  quantity numeric NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  channel text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_records TO authenticated;
GRANT ALL ON public.sales_records TO service_role;
ALTER TABLE public.sales_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sales all" ON public.sales_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX sales_records_user_idx ON public.sales_records(user_id, sale_date);

-- INVENTORY
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  batch_id uuid,
  sku text NOT NULL,
  name text,
  stock numeric NOT NULL DEFAULT 0,
  reorder_threshold numeric NOT NULL DEFAULT 0,
  cost numeric,
  price numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own inventory all" ON public.inventory_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX inventory_user_sku_idx ON public.inventory_items(user_id, sku);

-- PRODUCTS
CREATE TABLE public.product_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  batch_id uuid,
  sku text,
  name text,
  category text,
  price numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_records TO authenticated;
GRANT ALL ON public.product_records TO service_role;
ALTER TABLE public.product_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own product all" ON public.product_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- REVIEWS
CREATE TABLE public.review_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  batch_id uuid,
  product text,
  rating numeric,
  sentiment text,
  content text,
  review_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_records TO authenticated;
GRANT ALL ON public.review_records TO service_role;
ALTER TABLE public.review_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own review all" ON public.review_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ORDERS
CREATE TABLE public.order_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  batch_id uuid,
  order_id text,
  customer text,
  total numeric NOT NULL DEFAULT 0,
  status text,
  ordered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_records TO authenticated;
GRANT ALL ON public.order_records TO service_role;
ALTER TABLE public.order_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own order all" ON public.order_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- UPLOAD BATCHES
CREATE TABLE public.upload_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  filename text,
  row_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.upload_batches TO authenticated;
GRANT ALL ON public.upload_batches TO service_role;
ALTER TABLE public.upload_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own batch all" ON public.upload_batches FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
