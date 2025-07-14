-- Fix database functions and add missing functions

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS increment_view_count(uuid);
DROP FUNCTION IF EXISTS increment_like_count(uuid);
DROP FUNCTION IF EXISTS decrement_like_count(uuid);
DROP FUNCTION IF EXISTS get_user_stats(uuid);

-- Create increment_view_count function
CREATE OR REPLACE FUNCTION increment_view_count(product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE products 
  SET view_count = COALESCE(view_count, 0) + 1,
      updated_at = now()
  WHERE id = product_id;
END;
$$;

-- Create increment_like_count function
CREATE OR REPLACE FUNCTION increment_like_count(product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE products 
  SET like_count = COALESCE(like_count, 0) + 1,
      updated_at = now()
  WHERE id = product_id;
END;
$$;

-- Create decrement_like_count function
CREATE OR REPLACE FUNCTION decrement_like_count(product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE products 
  SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0),
      updated_at = now()
  WHERE id = product_id;
END;
$$;

-- Create get_user_stats function
CREATE OR REPLACE FUNCTION get_user_stats(user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_orders', COALESCE(COUNT(o.id), 0),
    'pending_orders', COALESCE(COUNT(o.id) FILTER (WHERE o.status = 'pending'), 0),
    'completed_orders', COALESCE(COUNT(o.id) FILTER (WHERE o.status = 'completed'), 0),
    'total_spent', COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'completed'), 0),
    'favorite_products', COALESCE(
      (SELECT COUNT(*) FROM likes l WHERE l.user_id = get_user_stats.user_id), 0
    ),
    'cart_items', COALESCE(
      (SELECT COUNT(*) FROM cart_items c WHERE c.user_id = get_user_stats.user_id), 0
    )
  ) INTO result
  FROM orders o
  WHERE o.user_id = get_user_stats.user_id;
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_view_count(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_like_count(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION decrement_like_count(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_stats(uuid) TO authenticated, anon;

-- Ensure contact_messages table exists
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'rejected')),
  admin_response text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on contact_messages
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contact_messages
CREATE POLICY "Anyone can insert contact messages" ON contact_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all contact messages" ON contact_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can update contact messages" ON contact_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- Add missing columns to orders table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'order_type') THEN
    ALTER TABLE orders ADD COLUMN order_type text DEFAULT 'website';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'anon_temp_id') THEN
    ALTER TABLE orders ADD COLUMN anon_temp_id text;
  END IF;
END $$;

-- Update categories table to use 'name' instead of 'name_uz'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'name_uz') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'name') THEN
      ALTER TABLE categories RENAME COLUMN name_uz TO name;
    END IF;
  END IF;
END $$;

-- Ensure products table has is_approved column
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_approved') THEN
    ALTER TABLE products ADD COLUMN is_approved boolean DEFAULT false;
  END IF;
END $$;

-- Update existing products to be approved by default
UPDATE products SET is_approved = true WHERE is_approved IS NULL OR is_approved = false;
