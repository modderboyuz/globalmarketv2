-- Remove messaging system tables and functions
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- Remove messaging-related functions
DROP FUNCTION IF EXISTS get_conversation_messages(uuid);
DROP FUNCTION IF EXISTS create_conversation(uuid, uuid, uuid);

-- Update cart_items table to fix issues
DROP TABLE IF EXISTS cart CASCADE;
CREATE TABLE IF NOT EXISTS cart_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id) ON DELETE CASCADE,
    quantity integer NOT NULL DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, product_id)
);

-- Enable RLS
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

-- Add profile_image_url to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url text;

-- Create function to get public seller info only
CREATE OR REPLACE FUNCTION get_public_seller_info(seller_id uuid)
RETURNS TABLE (
    full_name text,
    company_name text,
    phone text,
    profile_image_url text,
    is_verified_seller boolean,
    total_products bigint,
    total_orders bigint,
    average_rating numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.full_name,
        u.company_name,
        u.phone,
        u.profile_image_url,
        u.is_verified_seller,
        COALESCE(p.product_count, 0) as total_products,
        COALESCE(o.order_count, 0) as total_orders,
        COALESCE(r.avg_rating, 0) as average_rating
    FROM users u
    LEFT JOIN (
        SELECT seller_id, COUNT(*) as product_count
        FROM products
        WHERE is_active = true
        GROUP BY seller_id
    ) p ON u.id = p.seller_id
    LEFT JOIN (
        SELECT pr.seller_id, COUNT(*) as order_count
        FROM orders ord
        JOIN products pr ON ord.product_id = pr.id
        WHERE ord.status IN ('completed', 'delivered')
        GROUP BY pr.seller_id
    ) o ON u.id = o.seller_id
    LEFT JOIN (
        SELECT pr.seller_id, AVG(rev.rating) as avg_rating
        FROM product_reviews rev
        JOIN products pr ON rev.product_id = pr.id
        GROUP BY pr.seller_id
    ) r ON u.id = r.seller_id
    WHERE u.id = seller_id AND u.is_verified_seller = true;
END;
$$;
