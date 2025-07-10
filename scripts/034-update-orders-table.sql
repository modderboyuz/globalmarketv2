-- Add new columns to the orders table
ALTER TABLE public.orders
ADD COLUMN is_agree BOOLEAN DEFAULT FALSE;

ALTER TABLE public.orders
ADD COLUMN is_client_went BOOLEAN;

ALTER TABLE public.orders
ADD COLUMN is_client_claimed BOOLEAN;

ALTER TABLE public.orders
ADD COLUMN pickup_address TEXT;

ALTER TABLE public.orders
ADD COLUMN seller_notes TEXT;

ALTER TABLE public.orders
ADD COLUMN client_notes TEXT;

ALTER TABLE public.orders
ADD COLUMN stage INTEGER DEFAULT 1;
