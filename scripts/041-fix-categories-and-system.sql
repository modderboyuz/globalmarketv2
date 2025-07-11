-- Fix categories table - remove name_uz column and use name only
ALTER TABLE categories DROP COLUMN IF EXISTS name_uz;

-- Update all references to use name instead of name_uz
-- This is handled in the application code

-- Fix cart_items table structure
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Enable RLS on cart_items
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for cart_items
CREATE POLICY "Users can view their own cart items" ON cart_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cart items" ON cart_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart items" ON cart_items
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart items" ON cart_items
    FOR DELETE USING (auth.uid() = user_id);

-- Add profile_image_url column to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Create profiles storage bucket if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profiles', 'profiles', true) 
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for profiles bucket
CREATE POLICY "Users can upload their own profile images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view profile images" ON storage.objects
    FOR SELECT USING (bucket_id = 'profiles');

CREATE POLICY "Users can update their own profile images" ON storage.objects
    FOR UPDATE USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile images" ON storage.objects
    FOR DELETE USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Fix get_user_stats function to handle null values
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    total_products INTEGER := 0;
    total_orders INTEGER := 0;
    total_revenue DECIMAL := 0;
    avg_rating DECIMAL := 0;
BEGIN
    -- Get total products for seller
    SELECT COUNT(*) INTO total_products
    FROM products 
    WHERE seller_id = p_user_id AND is_active = true;
    
    -- Get total orders
    SELECT COUNT(*) INTO total_orders
    FROM orders 
    WHERE user_id = p_user_id;
    
    -- Get total revenue for seller
    SELECT COALESCE(SUM(total_amount), 0) INTO total_revenue
    FROM orders 
    WHERE seller_id = p_user_id AND status = 'completed';
    
    -- Get average rating
    SELECT COALESCE(AVG(rating), 0) INTO avg_rating
    FROM product_reviews pr
    JOIN products p ON pr.product_id = p.id
    WHERE p.seller_id = p_user_id;
    
    result := json_build_object(
        'total_products', total_products,
        'total_orders', total_orders,
        'total_revenue', total_revenue,
        'avg_rating', avg_rating,
        'total_views', 0,
        'followers_count', 0,
        'following_count', 0
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update categories with proper sort_order if not set
UPDATE categories SET sort_order = 1 WHERE name = 'Kitoblar' AND sort_order IS NULL;
UPDATE categories SET sort_order = 2 WHERE name = 'Maktab buyumlari' AND sort_order IS NULL;
UPDATE categories SET sort_order = 3 WHERE name = 'Ofis buyumlari' AND sort_order IS NULL;
UPDATE categories SET sort_order = 4 WHERE name = 'Elektronika' AND sort_order IS NULL;
UPDATE categories SET sort_order = 5 WHERE name = 'Kiyim-kechak' AND sort_order IS NULL;
UPDATE categories SET sort_order = 6 WHERE name = 'Boshqalar' AND sort_order IS NULL;

-- Ensure all categories have sort_order
UPDATE categories SET sort_order = id::integer WHERE sort_order IS NULL;
