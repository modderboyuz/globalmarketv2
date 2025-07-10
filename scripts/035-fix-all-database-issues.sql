-- Drop existing problematic functions and tables
DROP FUNCTION IF EXISTS public.get_user_stats(p_user_id uuid);
DROP TABLE IF EXISTS public.cart CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.likes CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50) DEFAULT 'info',
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for users to access their own notifications
CREATE POLICY "Users can access their own notifications" ON public.notifications
AS PERMISSIVE FOR ALL
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create likes table
CREATE TABLE public.likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    product_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT likes_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(user_id, product_id)
);

-- Enable RLS for likes
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own likes
CREATE POLICY "Users can manage their own likes" ON public.likes
AS PERMISSIVE FOR ALL
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix get_user_stats function
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
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE((SELECT COUNT(*) FROM products WHERE seller_id = p_user_id), 0)::BIGINT AS total_products,
    COALESCE((SELECT COUNT(*) FROM orders WHERE product_id IN (SELECT id FROM products WHERE seller_id = p_user_id)), 0)::BIGINT AS total_orders,
    COALESCE((SELECT SUM(total_amount) FROM orders WHERE product_id IN (SELECT id FROM products WHERE seller_id = p_user_id) AND status = 'completed'), 0)::NUMERIC AS total_revenue,
    COALESCE((SELECT AVG(COALESCE(average_rating, 0)) FROM products WHERE seller_id = p_user_id), 0)::NUMERIC AS avg_rating,
    COALESCE((SELECT SUM(COALESCE(view_count, 0)) FROM products WHERE seller_id = p_user_id), 0)::BIGINT AS total_views,
    0::BIGINT AS followers_count,
    0::BIGINT AS following_count;
END;
$$;

-- Create notification function
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id uuid,
    p_title text,
    p_message text DEFAULT NULL,
    p_type text DEFAULT 'info',
    p_data jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    notification_id uuid;
BEGIN
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (p_user_id, p_title, p_message, p_type, p_data)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$;

-- Update products table with missing columns
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating NUMERIC DEFAULT 0;

-- Update orders table with missing columns
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS is_agree BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_client_went BOOLEAN,
ADD COLUMN IF NOT EXISTS is_client_claimed BOOLEAN,
ADD COLUMN IF NOT EXISTS pickup_address TEXT,
ADD COLUMN IF NOT EXISTS seller_notes TEXT,
ADD COLUMN IF NOT EXISTS client_notes TEXT,
ADD COLUMN IF NOT EXISTS stage INTEGER DEFAULT 1;

-- Function to update product like count
CREATE OR REPLACE FUNCTION public.update_product_like_count(p_product_id uuid)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE products
    SET like_count = (
        SELECT COUNT(*)
        FROM likes
        WHERE product_id = p_product_id
    )
    WHERE id = p_product_id;
END;
$$;

-- Function to update product average rating
CREATE OR REPLACE FUNCTION public.update_product_average_rating(p_product_id uuid)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE products
    SET average_rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM product_reviews
        WHERE product_id = p_product_id
    )
    WHERE id = p_product_id;
END;
$$;

-- Trigger function for likes
CREATE OR REPLACE FUNCTION public.trigger_update_product_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.update_product_like_count(OLD.product_id);
        RETURN OLD;
    ELSE
        PERFORM public.update_product_like_count(NEW.product_id);
        RETURN NEW;
    END IF;
END;
$$;

-- Trigger function for reviews
CREATE OR REPLACE FUNCTION public.trigger_update_product_average_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.update_product_average_rating(OLD.product_id);
        RETURN OLD;
    ELSE
        PERFORM public.update_product_average_rating(NEW.product_id);
        RETURN NEW;
    END IF;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS update_like_count_trigger ON public.likes;
CREATE TRIGGER update_like_count_trigger
AFTER INSERT OR DELETE
ON public.likes
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_product_like_count();

DROP TRIGGER IF EXISTS update_average_rating_trigger ON public.product_reviews;
CREATE TRIGGER update_average_rating_trigger
AFTER INSERT OR UPDATE OR DELETE
ON public.product_reviews
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_product_average_rating();

-- Update existing products to have proper counts
UPDATE products SET 
    like_count = COALESCE((SELECT COUNT(*) FROM likes WHERE product_id = products.id), 0),
    average_rating = COALESCE((SELECT AVG(rating) FROM product_reviews WHERE product_id = products.id), 0);
