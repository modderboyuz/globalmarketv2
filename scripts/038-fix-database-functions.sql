-- Create or update like count functions
CREATE OR REPLACE FUNCTION increment_like_count(product_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE products 
  SET like_count = COALESCE(like_count, 0) + 1
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_like_count(product_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE products 
  SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;

-- Fix get_user_stats function
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
  total_products INTEGER,
  total_orders INTEGER,
  total_revenue NUMERIC,
  avg_rating NUMERIC,
  total_views INTEGER,
  followers_count INTEGER,
  following_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((SELECT COUNT(*)::INTEGER FROM products WHERE seller_id = p_user_id AND is_active = true), 0) as total_products,
    COALESCE((SELECT COUNT(*)::INTEGER FROM orders o 
              JOIN products p ON o.product_id = p.id 
              WHERE p.seller_id = p_user_id), 0) as total_orders,
    COALESCE((SELECT SUM(o.total_amount) FROM orders o 
              JOIN products p ON o.product_id = p.id 
              WHERE p.seller_id = p_user_id AND o.status = 'completed'), 0) as total_revenue,
    COALESCE((SELECT AVG(average_rating) FROM products WHERE seller_id = p_user_id AND is_active = true), 0) as avg_rating,
    COALESCE((SELECT SUM(view_count) FROM products WHERE seller_id = p_user_id AND is_active = true), 0) as total_views,
    0 as followers_count,
    0 as following_count;
END;
$$ LANGUAGE plpgsql;

-- Update products table to ensure all required columns exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create search index
CREATE INDEX IF NOT EXISTS products_search_idx ON products USING GIN(search_vector);

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.author, '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(NEW.brand, '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.tags, ' '), '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for search vector
DROP TRIGGER IF EXISTS update_product_search_vector_trigger ON products;
CREATE TRIGGER update_product_search_vector_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- Update existing products search vectors
UPDATE products SET search_vector = 
  setweight(to_tsvector('simple', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('simple', COALESCE(author, '')), 'C') ||
  setweight(to_tsvector('simple', COALESCE(brand, '')), 'C') ||
  setweight(to_tsvector('simple', COALESCE(array_to_string(tags, ' '), '')), 'D');
