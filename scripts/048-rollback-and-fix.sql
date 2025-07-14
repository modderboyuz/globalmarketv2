-- Rollback script to fix issues caused by script 047
-- This will restore the working state of the database

-- First, drop the problematic policies created in 047
DROP POLICY IF EXISTS "Admin full access to users" ON users;
DROP POLICY IF EXISTS "Admin full access to products" ON products;
DROP POLICY IF EXISTS "Admin full access to orders" ON orders;
DROP POLICY IF EXISTS "Admin full access to applications" ON seller_applications;
DROP POLICY IF EXISTS "Admin full access to product applications" ON product_applications;
DROP POLICY IF EXISTS "Admin full access to contact messages" ON contact_messages;

-- Restore the original working RLS policies

-- Users policies - allow viewing all users, updating own profile
CREATE POLICY "Users can view all profiles" ON users 
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users 
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all users" ON users 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    );

-- Products policies - public read, sellers manage own
CREATE POLICY "Anyone can view active products" ON products 
    FOR SELECT USING (true);

CREATE POLICY "Sellers can manage own products" ON products 
    FOR ALL USING (
        auth.uid() = seller_id OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    );

-- Orders policies - users see own orders, sellers see orders for their products
CREATE POLICY "Users can view own orders" ON orders 
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = orders.id AND p.seller_id = auth.uid()
        ) OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Users can create own orders" ON orders 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and sellers can update orders" ON orders 
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = orders.id AND p.seller_id = auth.uid()
        ) OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    );

-- Order items policies
CREATE POLICY "Users can view order items" ON order_items 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o 
            WHERE o.id = order_items.order_id AND (
                o.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM products p 
                    WHERE p.id = order_items.product_id AND p.seller_id = auth.uid()
                ) OR
                EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
            )
        )
    );

CREATE POLICY "Users can create order items" ON order_items 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders o 
            WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
        )
    );

-- Cart items policies
CREATE POLICY "Users can manage own cart" ON cart_items 
    FOR ALL USING (auth.uid() = user_id);

-- Applications policies
CREATE POLICY "Users can view own seller applications" ON seller_applications 
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Users can create seller applications" ON seller_applications 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update seller applications" ON seller_applications 
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Users can view own product applications" ON product_applications 
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Users can create product applications" ON product_applications 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update product applications" ON product_applications 
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    );

-- Contact messages policies
CREATE POLICY "Anyone can create contact messages" ON contact_messages 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view contact messages" ON contact_messages 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can update contact messages" ON contact_messages 
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    );

-- Reviews policies
CREATE POLICY "Anyone can view reviews" ON reviews 
    FOR SELECT USING (true);

CREATE POLICY "Users can create own reviews" ON reviews 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON reviews 
    FOR UPDATE USING (auth.uid() = user_id);

-- Complaints policies
CREATE POLICY "Users can view own complaints" ON complaints 
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Users can create own complaints" ON complaints 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update complaints" ON complaints 
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    );

-- Likes policies
CREATE POLICY "Users can manage own likes" ON likes 
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view likes" ON likes 
    FOR SELECT USING (true);

-- Categories policies
CREATE POLICY "Anyone can view categories" ON categories 
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON categories 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    );

-- Fix the get_user_stats function to return proper types
DROP FUNCTION IF EXISTS get_user_stats(UUID);
CREATE OR REPLACE FUNCTION get_user_stats(user_id_param UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    total_orders INTEGER := 0;
    total_spent NUMERIC := 0;
    total_products_sold INTEGER := 0;
    total_revenue NUMERIC := 0;
BEGIN
    -- Get total orders for user
    SELECT COUNT(*) INTO total_orders
    FROM orders 
    WHERE user_id = user_id_param;
    
    -- Get total spent by user
    SELECT COALESCE(SUM(total_amount), 0) INTO total_spent
    FROM orders 
    WHERE user_id = user_id_param AND status IN ('delivered', 'completed');
    
    -- Get total products sold by user (if seller)
    SELECT COUNT(*) INTO total_products_sold
    FROM products 
    WHERE seller_id = user_id_param;
    
    -- Get total revenue for seller
    SELECT COALESCE(SUM(oi.total), 0) INTO total_revenue
    FROM order_items oi 
    JOIN orders o ON oi.order_id = o.id 
    JOIN products p ON oi.product_id = p.id 
    WHERE p.seller_id = user_id_param AND o.status IN ('delivered', 'completed');
    
    result := json_build_object(
        'total_orders', total_orders,
        'total_spent', total_spent,
        'total_products_sold', total_products_sold,
        'total_revenue', total_revenue
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a simple function to increment product views
CREATE OR REPLACE FUNCTION increment_product_views(product_id_param UUID)
RETURNS void AS $$
BEGIN
    UPDATE products 
    SET views = COALESCE(views, 0) + 1, 
        updated_at = NOW()
    WHERE id = product_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle likes
CREATE OR REPLACE FUNCTION toggle_product_like(product_id_param UUID, user_id_param UUID)
RETURNS JSON AS $$
DECLARE
    existing_like_id UUID;
    current_likes_count INTEGER;
    is_liked BOOLEAN;
    result JSON;
BEGIN
    -- Check if like exists
    SELECT id INTO existing_like_id 
    FROM likes 
    WHERE product_id = product_id_param AND user_id = user_id_param;
    
    IF existing_like_id IS NOT NULL THEN
        -- Remove like
        DELETE FROM likes WHERE id = existing_like_id;
        is_liked := false;
    ELSE
        -- Add like
        INSERT INTO likes (product_id, user_id) VALUES (product_id_param, user_id_param);
        is_liked := true;
    END IF;
    
    -- Get current likes count
    SELECT COUNT(*) INTO current_likes_count 
    FROM likes 
    WHERE product_id = product_id_param;
    
    -- Update product likes count
    UPDATE products 
    SET likes_count = current_likes_count 
    WHERE id = product_id_param;
    
    result := json_build_object(
        'success', true,
        'liked', is_liked,
        'likes_count', current_likes_count
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove the problematic constraints that might be causing issues
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;

-- Add them back with proper syntax
ALTER TABLE products ADD CONSTRAINT products_status_check 
    CHECK (status IN ('active', 'inactive', 'out_of_stock'));

ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'completed'));

-- Ensure all tables have proper permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant read access to anonymous users for public data
GRANT SELECT ON categories TO anon;
GRANT SELECT ON products TO anon;
GRANT SELECT ON users TO anon;
GRANT SELECT ON reviews TO anon;
GRANT SELECT ON likes TO anon;

-- Make sure admin user exists and is properly configured
UPDATE users 
SET is_admin = true, is_active = true, updated_at = NOW()
WHERE email = 'admin@globalmarket.uz';

-- If admin doesn't exist, create it
INSERT INTO users (
    full_name, 
    email, 
    username, 
    is_admin, 
    is_active,
    created_at,
    updated_at
) VALUES (
    'GlobalMarket Admin',
    'admin@globalmarket.uz',
    'admin',
    true,
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    is_admin = true,
    is_active = true,
    updated_at = NOW();

-- Ensure categories exist
INSERT INTO categories (name, slug, icon, description, is_active) VALUES
('Kitoblar', 'kitoblar', '📚', 'Barcha turdagi kitoblar', true),
('Elektronika', 'elektronika', '📱', 'Elektronik qurilmalar', true),
('Kiyim', 'kiyim', '👕', 'Erkaklar va ayollar kiyimi', true),
('Uy-ro''zg''or', 'uy-rozgor', '🏠', 'Uy uchun buyumlar', true),
('Sport', 'sport', '⚽', 'Sport anjomlari', true),
('Go''zallik', 'gozallik', '💄', 'Go''zallik mahsulotlari', true),
('Boshqa', 'boshqa', '📦', 'Boshqa kategoriyalar', true)
ON CONFLICT (slug) DO NOTHING;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
