-- Fix database functions and add missing ones

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS increment_view_count(UUID);
DROP FUNCTION IF EXISTS increment_like_count(UUID);
DROP FUNCTION IF EXISTS decrement_like_count(UUID);

-- Create function to increment view count
CREATE OR REPLACE FUNCTION increment_view_count(product_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE products 
  SET view_count = COALESCE(view_count, 0) + 1,
      updated_at = NOW()
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment like count
CREATE OR REPLACE FUNCTION increment_like_count(product_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE products 
  SET like_count = COALESCE(like_count, 0) + 1,
      updated_at = NOW()
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to decrement like count
CREATE OR REPLACE FUNCTION decrement_like_count(product_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE products 
  SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0),
      updated_at = NOW()
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix products table to ensure all required columns exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS order_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.0;

-- Update existing products to have default values
UPDATE products 
SET 
  view_count = COALESCE(view_count, 0),
  like_count = COALESCE(like_count, 0),
  order_count = COALESCE(order_count, 0),
  average_rating = COALESCE(average_rating, 0.0)
WHERE view_count IS NULL OR like_count IS NULL OR order_count IS NULL OR average_rating IS NULL;

-- Fix cart_items table to use correct column names
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_product_id_fkey;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION increment_view_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_like_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_like_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_product_order_count() TO authenticated;
