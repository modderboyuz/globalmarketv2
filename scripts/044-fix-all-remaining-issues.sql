-- Fix all remaining database issues

-- 1. Fix categories table to use consistent naming
ALTER TABLE categories RENAME COLUMN name_uz TO name;
ALTER TABLE categories RENAME COLUMN name_en TO name_en;
ALTER TABLE categories RENAME COLUMN name_ru TO name_ru;

-- 2. Ensure categories has all needed columns
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon VARCHAR(10) DEFAULT '📦';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Update categories with proper data
UPDATE categories SET 
  slug = LOWER(REPLACE(REPLACE(name, ' ', '-'), '''', ''))
WHERE slug IS NULL;

-- 4. Fix orders table structure completely
ALTER TABLE orders DROP COLUMN IF EXISTS seller_id;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_phone VARCHAR(20);

-- 5. Create cart table if not exists
CREATE TABLE IF NOT EXISTS cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Ensure cart_items table exists and is correct
DROP TABLE IF EXISTS cart_items CASCADE;
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- 7. Fix likes table
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- 8. Create reviews table if not exists
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id, order_id)
);

-- 9. Create complaints table if not exists
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  complaint_text TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  admin_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Enable RLS on all tables
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS policies for cart_items
DROP POLICY IF EXISTS "Users can manage their cart items" ON cart_items;
CREATE POLICY "Users can manage their cart items" ON cart_items
  FOR ALL USING (auth.uid() = user_id);

-- 12. Create RLS policies for likes
DROP POLICY IF EXISTS "Users can manage their likes" ON likes;
CREATE POLICY "Users can manage their likes" ON likes
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view likes" ON likes;
CREATE POLICY "Anyone can view likes" ON likes
  FOR SELECT USING (true);

-- 13. Create RLS policies for reviews
DROP POLICY IF EXISTS "Users can manage their reviews" ON reviews;
CREATE POLICY "Users can manage their reviews" ON reviews
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
CREATE POLICY "Anyone can view reviews" ON reviews
  FOR SELECT USING (true);

-- 14. Create RLS policies for complaints
DROP POLICY IF EXISTS "Users can manage their complaints" ON complaints;
CREATE POLICY "Users can manage their complaints" ON complaints
  FOR ALL USING (auth.uid() = user_id);

-- 15. Update products table to ensure all columns exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS order_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.0;

-- 16. Create function to update product stats
CREATE OR REPLACE FUNCTION update_product_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update like count
  IF TG_TABLE_NAME = 'likes' THEN
    UPDATE products SET 
      like_count = (SELECT COUNT(*) FROM likes WHERE product_id = COALESCE(NEW.product_id, OLD.product_id))
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  END IF;
  
  -- Update order count
  IF TG_TABLE_NAME = 'orders' THEN
    UPDATE products SET 
      order_count = (SELECT COUNT(*) FROM orders WHERE product_id = COALESCE(NEW.product_id, OLD.product_id) AND status = 'completed')
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  END IF;
  
  -- Update average rating
  IF TG_TABLE_NAME = 'reviews' THEN
    UPDATE products SET 
      average_rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE product_id = COALESCE(NEW.product_id, OLD.product_id))
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 17. Create triggers for product stats
DROP TRIGGER IF EXISTS trigger_update_like_count ON likes;
CREATE TRIGGER trigger_update_like_count
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION update_product_stats();

DROP TRIGGER IF EXISTS trigger_update_order_count ON orders;
CREATE TRIGGER trigger_update_order_count
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_product_stats();

DROP TRIGGER IF EXISTS trigger_update_rating ON reviews;
CREATE TRIGGER trigger_update_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_product_stats();

-- 18. Create function to increment view count
CREATE OR REPLACE FUNCTION increment_view_count(product_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE products 
  SET view_count = COALESCE(view_count, 0) + 1,
      updated_at = NOW()
  WHERE id = product_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 19. Grant all necessary permissions
GRANT ALL ON cart_items TO authenticated;
GRANT ALL ON likes TO authenticated;
GRANT ALL ON reviews TO authenticated;
GRANT ALL ON complaints TO authenticated;
GRANT EXECUTE ON FUNCTION increment_view_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_product_stats() TO authenticated;

-- 20. Insert sample categories if empty
INSERT INTO categories (name, slug, icon, description, is_active) VALUES
('Kitoblar', 'kitoblar', '📚', 'Barcha turdagi kitoblar', true),
('Elektronika', 'elektronika', '📱', 'Elektron qurilmalar', true),
('Kiyim', 'kiyim', '👕', 'Erkaklar va ayollar kiyimlari', true),
('Uy-ro''zg''or', 'uy-rozgor', '🏠', 'Uy uchun buyumlar', true),
('Sport', 'sport', '⚽', 'Sport anjomlari', true),
('Go''zallik', 'gozallik', '💄', 'Go''zallik mahsulotlari', true)
ON CONFLICT (slug) DO NOTHING;

-- 21. Update existing products to have category if missing
UPDATE products 
SET category_id = (SELECT id FROM categories LIMIT 1)
WHERE category_id IS NULL;
