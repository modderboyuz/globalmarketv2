-- Drop existing functions that might cause conflicts
DROP FUNCTION IF EXISTS get_user_stats();
DROP FUNCTION IF EXISTS update_product_popularity();

-- Create comprehensive order tracking system
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_agree BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_client_went BOOLEAN DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_client_claimed BOOLEAN DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stage INTEGER DEFAULT 1;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE;

-- Update orders status enum to include new statuses
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status_new') THEN
        CREATE TYPE order_status_new AS ENUM ('pending', 'confirmed', 'ready', 'completed', 'cancelled');
        ALTER TABLE orders ALTER COLUMN status TYPE order_status_new USING status::text::order_status_new;
        DROP TYPE IF EXISTS order_status;
        ALTER TYPE order_status_new RENAME TO order_status;
    END IF;
END $$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(order_id, user_id, product_id)
);

-- Create complaints table
CREATE TABLE IF NOT EXISTS complaints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    complaint_text TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    admin_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Fix cart_items table (rename from cart if needed)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cart') THEN
        ALTER TABLE cart RENAME TO cart_items;
    END IF;
END $$;

-- Ensure cart_items table exists with correct structure
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Add stock management to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sold_quantity INTEGER DEFAULT 0;

-- Update existing products with default stock
UPDATE products SET stock_quantity = 100 WHERE stock_quantity IS NULL OR stock_quantity = 0;

-- Create function to get user stats (fixed)
CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS TABLE (
    total_users BIGINT,
    total_products BIGINT,
    total_orders BIGINT,
    total_applications BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM users)::BIGINT as total_users,
        (SELECT COUNT(*) FROM products)::BIGINT as total_products,
        (SELECT COUNT(*) FROM orders)::BIGINT as total_orders,
        (SELECT COUNT(*) FROM seller_applications WHERE status = 'pending')::BIGINT as total_applications;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update product stock
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Decrease stock when order is completed
        UPDATE products 
        SET 
            stock_quantity = stock_quantity - NEW.quantity,
            sold_quantity = sold_quantity + NEW.quantity
        WHERE id = NEW.product_id;
    ELSIF OLD.status = 'completed' AND NEW.status != 'completed' THEN
        -- Restore stock if order status changes from completed
        UPDATE products 
        SET 
            stock_quantity = stock_quantity + OLD.quantity,
            sold_quantity = sold_quantity - OLD.quantity
        WHERE id = OLD.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stock management
DROP TRIGGER IF EXISTS update_stock_trigger ON orders;
CREATE TRIGGER update_stock_trigger
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_product_stock();

-- Create function to calculate seller rating
CREATE OR REPLACE FUNCTION calculate_seller_rating(seller_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    avg_rating DECIMAL;
BEGIN
    SELECT AVG(r.rating)::DECIMAL
    INTO avg_rating
    FROM reviews r
    JOIN products p ON r.product_id = p.id
    WHERE p.user_id = seller_user_id;
    
    RETURN COALESCE(avg_rating, 0);
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on new tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create reviews for their completed orders" ON reviews
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view all reviews" ON reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can create complaints for their orders" ON complaints
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own complaints" ON complaints
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all complaints" ON complaints
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND type = 'admin'
        )
    );

CREATE POLICY "Users can manage their cart items" ON cart_items
    FOR ALL USING (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON reviews TO authenticated;
GRANT ALL ON complaints TO authenticated;
GRANT ALL ON cart_items TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_seller_rating(UUID) TO authenticated;

-- Remove messaging tables completely
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS admin_messages CASCADE;

-- Update seller applications to fix the count issue
UPDATE seller_applications SET status = 'pending' WHERE status IS NULL;

-- Insert sample notification for testing
INSERT INTO notifications (user_id, title, message, type) 
SELECT id, 'Xush kelibsiz!', 'GlobalMarket ga xush kelibsiz!', 'info' 
FROM users 
WHERE type = 'customer' 
LIMIT 1
ON CONFLICT DO NOTHING;
