
-- Calculation Strategies
CREATE TABLE public.calculation_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text
);

ALTER TABLE public.calculation_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read strategies"
  ON public.calculation_strategies FOR SELECT
  USING (true);

-- Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories"
  ON public.categories FOR SELECT
  USING (true);

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id),
  strategy_id uuid REFERENCES public.calculation_strategies(id) NOT NULL,
  name text NOT NULL,
  price numeric NOT NULL,
  image_url text,
  description text,
  application_warnings text[],
  calculator_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read products"
  ON public.products FOR SELECT
  USING (true);
