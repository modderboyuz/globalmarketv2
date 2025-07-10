DROP FUNCTION IF EXISTS public.get_user_stats(p_user_id uuid);

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
    (SELECT COUNT(*) FROM products WHERE seller_id = p_user_id) AS total_products,
    (SELECT COUNT(*) FROM orders WHERE product_id IN (SELECT id FROM products WHERE seller_id = p_user_id)) AS total_orders,
    (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE product_id IN (SELECT id FROM products WHERE seller_id = p_user_id) AND status = 'completed') AS total_revenue,
    (SELECT COALESCE(AVG(CASE WHEN average_rating IS NULL THEN 0 ELSE average_rating END), 0) FROM products WHERE seller_id = p_user_id) AS avg_rating,
    (SELECT COALESCE(SUM(view_count), 0) FROM products WHERE seller_id = p_user_id) AS total_views,
    (SELECT COUNT(*) FROM followers WHERE followed_id = p_user_id) AS followers_count,
    (SELECT COUNT(*) FROM followers WHERE follower_id = p_user_id) AS following_count;
END;
$$
LANGUAGE plpgsql;
