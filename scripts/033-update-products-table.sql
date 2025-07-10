-- Add average_rating column to products table
ALTER TABLE public.products
ADD COLUMN average_rating NUMERIC DEFAULT 0;

-- Add like_count column to products table
ALTER TABLE public.products
ADD COLUMN like_count INTEGER DEFAULT 0;

-- Function to update average rating
CREATE OR REPLACE FUNCTION public.update_product_average_rating(p_product_id uuid)
RETURNS VOID AS $$
BEGIN
    UPDATE products
    SET average_rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM product_reviews
        WHERE product_id = p_product_id
    )
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to call update_product_average_rating after insert/update on product_reviews
CREATE OR REPLACE FUNCTION public.trigger_update_product_average_rating()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.update_product_average_rating(NEW.product_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_average_rating_trigger ON public.product_reviews;
CREATE TRIGGER update_average_rating_trigger
AFTER INSERT OR UPDATE OR DELETE
ON public.product_reviews
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_product_average_rating();

-- Function to update like count (example - you'll need to adapt this to your liking system)
CREATE OR REPLACE FUNCTION public.update_product_like_count(p_product_id uuid)
RETURNS VOID AS $$
BEGIN
    UPDATE products
    SET like_count = (
        SELECT COUNT(*)
        FROM likes
        WHERE product_id = p_product_id
    )
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to call update_product_like_count after insert/delete on likes (example)
CREATE OR REPLACE FUNCTION public.trigger_update_product_like_count()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.update_product_like_count(NEW.product_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (example - adapt to your likes table)
DROP TRIGGER IF EXISTS update_like_count_trigger ON public.likes;
CREATE TRIGGER update_like_count_trigger
AFTER INSERT OR DELETE
ON public.likes
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_product_like_count();
