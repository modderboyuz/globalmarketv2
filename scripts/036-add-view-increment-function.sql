-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_view_count(product_id uuid)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE products
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = product_id;
END;
$$;
