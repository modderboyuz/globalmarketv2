-- Fix all database issues and ensure proper structure
-- This script addresses the build errors and ensures all tables work correctly

-- Drop and recreate problematic functions
DROP FUNCTION IF EXISTS get_user_stats(UUID);
CREATE OR REPLACE FUNCTION get_user_stats(user_id_param UUID)
RETURNS TABLE(
    total_orders BIGINT,
    total_spent NUMERIC,
    total_products_sold BIGINT,
    total_revenue NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE((SELECT COUNT(*) FROM orders WHERE user_id = user_id_param), 0)::BIGINT,
        COALESCE((SELECT SUM(total_amount) FROM orders WHERE user_id = user_id_param AND status IN ('delivered', 'completed')), 0)::NUMERIC,
        COALESCE((SELECT COUNT(*) FROM products WHERE seller_id = user_id_param), 0)::BIGINT,
        COALESCE((
            SELECT SUM(oi.total) 
            FROM order_items oi 
            JOIN orders o ON oi.order_id = o.id 
            JOIN products p ON oi.product_id = p.id 
            WHERE p.seller_id = user_id_param AND o.status IN ('delivered', 'completed')
        ), 0)::NUMERIC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure all required columns exist in products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS orders_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_price NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS return_price NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_delivery BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_return BOOLEAN DEFAULT FALSE;

-- Update products table structure to match expected format
ALTER TABLE products 
ALTER COLUMN price TYPE NUMERIC(12,2),
ALTER COLUMN delivery_price TYPE NUMERIC(12,2),
ALTER COLUMN return_price TYPE NUMERIC(12,2);

-- Ensure orders table has correct structure
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS delivery_phone TEXT,
ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Add check constraints if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_status_check') THEN
        ALTER TABLE products ADD CONSTRAINT products_status_check 
        CHECK (status IN ('active', 'inactive', 'out_of_stock'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_check') THEN
        ALTER TABLE orders ADD CONSTRAINT orders_status_check 
        CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'completed'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_status_check') THEN
        ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check 
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
    END IF;
END $$;

-- Create missing indexes
CREATE INDEX IF NOT EXISTS idx_products_seller_status ON products(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_products_category_status ON products(category_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_users_seller_active ON users(is_seller, is_active);
CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin);

-- Update RLS policies to be more permissive for admin operations
DROP POLICY IF EXISTS "Admin full access to users" ON users;
CREATE POLICY "Admin full access to users" ON users FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    OR auth.uid() = users.id
);

DROP POLICY IF EXISTS "Admin full access to products" ON products;
CREATE POLICY "Admin full access to products" ON products FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    OR auth.uid() = seller_id
    OR status = 'active'
);

DROP POLICY IF EXISTS "Admin full access to orders" ON orders;
CREATE POLICY "Admin full access to orders" ON orders FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    OR auth.uid() = user_id
);

DROP POLICY IF EXISTS "Admin full access to applications" ON seller_applications;
CREATE POLICY "Admin full access to applications" ON seller_applications FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    OR auth.uid() = user_id
);

DROP POLICY IF EXISTS "Admin full access to product applications" ON product_applications;
CREATE POLICY "Admin full access to product applications" ON product_applications FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    OR auth.uid() = user_id
);

DROP POLICY IF EXISTS "Admin full access to contact messages" ON contact_messages;
CREATE POLICY "Admin full access to contact messages" ON contact_messages FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    OR true
);

-- Ensure admin user exists with correct permissions
INSERT INTO users (
    id,
    full_name, 
    email, 
    username, 
    is_admin, 
    is_active,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
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

-- Create GlobalMarket company user
INSERT INTO users (
    id,
    full_name, 
    email, 
    username, 
    is_seller,
    is_verified_seller,
    is_admin,
    is_active,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    'GlobalMarket',
    'globalmarket@globalmarket.uz',
    'globalmarket',
    true,
    true,
    true,
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    is_seller = true,
    is_verified_seller = true,
    is_admin = true,
    is_active = true,
    updated_at = NOW();

-- Grant all necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated;

-- Refresh the schema
SELECT pg_notify('pgrst', 'reload schema');
