-- Fix all remaining database issues

-- Ensure cart table exists with correct structure
DROP TABLE IF EXISTS cart CASCADE;
CREATE TABLE cart (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS on cart
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for cart
CREATE POLICY "Users can view own cart" ON cart
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into own cart" ON cart
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart" ON cart
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from own cart" ON cart
  FOR DELETE USING (auth.uid() = user_id);

-- Ensure likes table exists with correct structure
CREATE TABLE IF NOT EXISTS likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS on likes
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for likes
CREATE POLICY "Anyone can view likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Users can insert likes" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON likes FOR DELETE USING (auth.uid() = user_id);

-- Fix products table to ensure all required columns exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS like_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS order_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating decimal(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Update existing products
UPDATE products 
SET 
  view_count = COALESCE(view_count, 0),
  like_count = COALESCE(like_count, 0),
  order_count = COALESCE(order_count, 0),
  average_rating = COALESCE(average_rating, 0.0),
  is_approved = COALESCE(is_approved, true),
  is_active = COALESCE(is_active, true)
WHERE view_count IS NULL OR like_count IS NULL OR order_count IS NULL OR average_rating IS NULL OR is_approved IS NULL OR is_active IS NULL;

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

-- Fix orders table structure
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'website',
ADD COLUMN IF NOT EXISTS anon_temp_id text,
ADD COLUMN IF NOT EXISTS delivery_address text,
ADD COLUMN IF NOT EXISTS delivery_phone text,
ADD COLUMN IF NOT EXISTS is_agree boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_client_went boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_client_claimed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pickup_address text,
ADD COLUMN IF NOT EXISTS seller_notes text,
ADD COLUMN IF NOT EXISTS client_notes text;

-- Update categories table to use 'name' instead of 'name_uz'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'name_uz') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'name') THEN
      ALTER TABLE categories RENAME COLUMN name_uz TO name;
    END IF;
  END IF;
END $$;

-- Recreate database functions
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
      (SELECT COUNT(*) FROM cart c WHERE c.user_id = get_user_stats.user_id), 0
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

-- Create trigger to update product order count when order is completed
CREATE OR REPLACE FUNCTION update_product_order_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE products 
    SET order_count = COALESCE(order_count, 0) + NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_order_count ON orders;
CREATE TRIGGER trigger_update_product_order_count
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_product_order_count();
