-- Fix get_user_stats function to return correct types
DROP FUNCTION IF EXISTS get_user_stats(UUID);

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
    COALESCE((SELECT SUM(o.total_amount)::NUMERIC FROM orders o 
              JOIN products p ON o.product_id = p.id 
              WHERE p.seller_id = p_user_id AND o.status = 'completed'), 0::NUMERIC) as total_revenue,
    COALESCE((SELECT AVG(average_rating)::NUMERIC FROM products WHERE seller_id = p_user_id AND is_active = true), 0::NUMERIC) as avg_rating,
    COALESCE((SELECT SUM(view_count)::INTEGER FROM products WHERE seller_id = p_user_id AND is_active = true), 0) as total_views,
    0::INTEGER as followers_count,
    0::INTEGER as following_count;
END;
$$ LANGUAGE plpgsql;
