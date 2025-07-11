-- Fix all database issues comprehensively

-- 1. Fix categories table - ensure only 'name' column exists
ALTER TABLE categories DROP COLUMN IF EXISTS name_uz CASCADE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';

-- Update existing categories with proper names
UPDATE categories SET name = 'Kitoblar' WHERE icon = '📚';
UPDATE categories SET name = 'Maktab buyumlari' WHERE icon = '✏️';
UPDATE categories SET name = 'Ofis buyumlari' WHERE icon = '📋';
UPDATE categories SET name = 'Elektronika' WHERE icon = '💻';
UPDATE categories SET name = 'Kiyim-kechak' WHERE icon = '👕';
UPDATE categories SET name = 'Boshqalar' WHERE icon = '🛍️';

-- 2. Fix contact_messages table - add missing columns
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS book_request_title TEXT;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS book_request_author TEXT;

-- 3. Fix cart_items table and ensure proper structure
DROP TABLE IF EXISTS cart_items CASCADE;
CREATE TABLE cart_items (
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
DROP POLICY IF EXISTS "Users can view their own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can insert their own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can update their own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can delete their own cart items" ON cart_items;

CREATE POLICY "Users can view their own cart items" ON cart_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cart items" ON cart_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart items" ON cart_items
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart items" ON cart_items
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Fix storage policies for profile images
DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile images" ON storage.objects;

-- Create storage bucket for profiles if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profiles', 'profiles', true) 
ON CONFLICT (id) DO NOTHING;

-- Create proper storage policies
CREATE POLICY "Anyone can view profile images" ON storage.objects
    FOR SELECT USING (bucket_id = 'profiles');

CREATE POLICY "Users can upload profile images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'profiles');

CREATE POLICY "Users can update profile images" ON storage.objects
    FOR UPDATE USING (bucket_id = 'profiles');

CREATE POLICY "Users can delete profile images" ON storage.objects
    FOR DELETE USING (bucket_id = 'profiles');

-- 5. Fix products storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('products', 'products', true) 
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for products
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete product images" ON storage.objects;

CREATE POLICY "Anyone can view product images" ON storage.objects
    FOR SELECT USING (bucket_id = 'products');

CREATE POLICY "Users can upload product images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'products');

CREATE POLICY "Users can update product images" ON storage.objects
    FOR UPDATE USING (bucket_id = 'products');

CREATE POLICY "Users can delete product images" ON storage.objects
    FOR DELETE USING (bucket_id = 'products');

-- 6. Fix orders table to support 4-stage process
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_agree BOOLEAN DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_client_went BOOLEAN DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_client_claimed BOOLEAN DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);

-- 7. Ensure all required columns exist in users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS seller_rating DECIMAL DEFAULT 0;

-- 8. Fix products table to ensure all columns exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- 9. Create function to update product popularity
CREATE OR REPLACE FUNCTION update_product_popularity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products 
    SET popularity_score = (
        COALESCE(order_count, 0) * 3 + 
        COALESCE(view_count, 0) * 1 + 
        COALESCE(like_count, 0) * 2 +
        COALESCE(average_rating, 0) * 10
    )
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for popularity updates
DROP TRIGGER IF EXISTS update_popularity_on_order ON orders;
DROP TRIGGER IF EXISTS update_popularity_on_like ON product_likes;
DROP TRIGGER IF EXISTS update_popularity_on_view ON product_views;

CREATE TRIGGER update_popularity_on_order
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_product_popularity();

CREATE TRIGGER update_popularity_on_like
    AFTER INSERT OR DELETE ON product_likes
    FOR EACH ROW EXECUTE FUNCTION update_product_popularity();

-- 10. Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 11. Update RLS policies for admin access
CREATE POLICY "Admins can view all orders" ON orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

CREATE POLICY "Admins can update all orders" ON orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- 12. Fix company table
CREATE TABLE IF NOT EXISTS company (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'GlobalMarket',
    logo_url TEXT,
    favicon_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default company data
INSERT INTO company (name, logo_url, favicon_url) 
VALUES ('GlobalMarket', '/placeholder-logo.png', '/favicon.ico')
ON CONFLICT DO NOTHING;

-- Enable RLS and create policy for company
ALTER TABLE company ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view company info" ON company
    FOR SELECT USING (true);

CREATE POLICY "Admins can update company info" ON company
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- 13. Refresh all materialized views if any exist
-- (Add any materialized view refreshes here if needed)

-- 14. Update statistics
ANALYZE;
