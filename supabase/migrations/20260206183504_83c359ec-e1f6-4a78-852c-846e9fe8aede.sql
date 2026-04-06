
-- Create product_images table for multiple images per product
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can read product images"
ON public.product_images FOR SELECT
USING (true);

-- Authenticated users can manage
CREATE POLICY "Authenticated users can insert product images"
ON public.product_images FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update product images"
ON public.product_images FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete product images"
ON public.product_images FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Index for fast lookups
CREATE INDEX idx_product_images_product_id ON public.product_images (product_id, display_order);

-- Migrate existing image_url data from products table
INSERT INTO public.product_images (product_id, image_url, display_order)
SELECT id, image_url, 0 FROM public.products WHERE image_url IS NOT NULL AND image_url != '';
