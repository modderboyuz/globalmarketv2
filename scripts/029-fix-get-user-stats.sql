-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.get_user_stats(p_user_id uuid);

-- Create the function
CREATE OR REPLACE FUNCTION public.get_user_stats(p_user_id uuid)
RETURNS TABLE (
    total_products BIGINT,
    total_orders BIGINT,
    total_revenue NUMERIC,
    avg_rating NUMERIC,
    total_views BIGINT,
    followers_count BIGINT,
    following_count BIGINT
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT count(*) FROM products WHERE seller_id = p_user_id) as total_products,
    (SELECT count(*) FROM orders WHERE product_id IN (SELECT id FROM products WHERE seller_id = p_user_id)) as total_orders,
    (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE product_id IN (SELECT id FROM products WHERE seller_id = p_user_id) AND status = 'completed') as total_revenue,
    (SELECT COALESCE(AVG(average_rating), 0) FROM products WHERE seller_id = p_user_id) as avg_rating,
    (SELECT COALESCE(SUM(view_count), 0) FROM products WHERE seller_id = p_user_id) as total_views,
    (SELECT count(*) FROM followers WHERE followed_id = p_user_id) as followers_count,
    (SELECT count(*) FROM followers WHERE follower_id = p_user_id) as following_count;
END;
$$
LANGUAGE plpgsql;
