-- Add new columns to orders table for comprehensive tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_agree BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_client_went BOOLEAN DEFAULT null;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_client_claimed BOOLEAN DEFAULT null;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_notes TEXT;

-- Add columns to products table for reviews
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_rating_sum INTEGER DEFAULT 0;

-- Create product_reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(order_id, user_id, product_id)
);

-- Enable RLS for product_reviews
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_reviews
CREATE POLICY "Anyone can view reviews" ON product_reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can create reviews for their orders" ON product_reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON product_reviews
    FOR UPDATE USING (auth.uid() = user_id);

-- Create complaints table
CREATE TABLE IF NOT EXISTS complaints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    complaint_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'rejected')),
    admin_response TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for complaints
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- RLS policies for complaints
CREATE POLICY "Users can view own complaints" ON complaints
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create complaints" ON complaints
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all complaints" ON complaints
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Function to update product rating
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE products 
        SET 
            review_count = review_count + 1,
            total_rating_sum = total_rating_sum + NEW.rating,
            average_rating = ROUND((total_rating_sum + NEW.rating)::numeric / (review_count + 1), 1)
        WHERE id = NEW.product_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE products 
        SET 
            total_rating_sum = total_rating_sum - OLD.rating + NEW.rating,
            average_rating = ROUND((total_rating_sum - OLD.rating + NEW.rating)::numeric / review_count, 1)
        WHERE id = NEW.product_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE products 
        SET 
            review_count = GREATEST(review_count - 1, 0),
            total_rating_sum = GREATEST(total_rating_sum - OLD.rating, 0),
            average_rating = CASE 
                WHEN review_count - 1 = 0 THEN 0 
                ELSE ROUND((total_rating_sum - OLD.rating)::numeric / (review_count - 1), 1)
            END
        WHERE id = OLD.product_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for product rating updates
DROP TRIGGER IF EXISTS trigger_update_product_rating ON product_reviews;
CREATE TRIGGER trigger_update_product_rating
    AFTER INSERT OR UPDATE OR DELETE ON product_reviews
    FOR EACH ROW EXECUTE FUNCTION update_product_rating();

-- Function to update stock when order is completed
CREATE OR REPLACE FUNCTION update_stock_on_order_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- When order status changes to completed, decrease stock
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE products 
        SET stock_quantity = GREATEST(stock_quantity - NEW.quantity, 0)
        WHERE id = NEW.product_id;
    -- When order is cancelled, restore stock if it was previously completed
    ELSIF NEW.status = 'cancelled' AND OLD.status = 'completed' THEN
        UPDATE products 
        SET stock_quantity = stock_quantity + NEW.quantity
        WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stock updates
DROP TRIGGER IF EXISTS trigger_update_stock_on_order_completion ON orders;
CREATE TRIGGER trigger_update_stock_on_order_completion
    AFTER UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_stock_on_order_completion();

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title VARCHAR(255),
    p_message TEXT,
    p_type VARCHAR(50),
    p_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (p_user_id, p_title, p_message, p_type, p_data)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user stats (fixed)
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS TABLE(
    total_orders BIGINT,
    completed_orders BIGINT,
    pending_orders BIGINT,
    total_spent NUMERIC,
    favorite_products BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_orders,
        COUNT(CASE WHEN o.status = 'completed' THEN 1 END)::BIGINT as completed_orders,
        COUNT(CASE WHEN o.status = 'pending' THEN 1 END)::BIGINT as pending_orders,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total_amount ELSE 0 END), 0) as total_spent,
        0::BIGINT as favorite_products
    FROM orders o
    WHERE o.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_notification(UUID, VARCHAR(255), TEXT, VARCHAR(50), JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO anon;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_is_agree ON orders(is_agree);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);

-- Remove messaging tables completely
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS messages CASCADE;

-- Update admin_messages to only handle system messages and applications
UPDATE admin_messages SET type = 'system_message' WHERE type NOT IN ('contact', 'seller_application', 'product_approval');

-- Sample data for testing
INSERT INTO categories (name_uz, name_ru, name_en, slug, icon, description, is_active, sort_order) VALUES
('Kitoblar', 'Книги', 'Books', 'kitoblar', '📚', 'Darsliklar va adabiy asarlar', true, 1),
('Maktab buyumlari', 'Школьные принадлежности', 'School supplies', 'maktab-buyumlari', '✏️', 'Maktab uchun kerakli buyumlar', true, 2),
('Ofis jihozlari', 'Офисная техника', 'Office equipment', 'ofis-jihozlari', '🖥️', 'Ofis uchun texnika va jihozlar', true, 3)
ON CONFLICT (slug) DO NOTHING;

-- Update existing products with proper data
UPDATE products SET 
    is_active = true,
    is_approved = true,
    stock_quantity = CASE 
        WHEN stock_quantity IS NULL OR stock_quantity = 0 THEN 50 
        ELSE stock_quantity 
    END,
    order_count = COALESCE(order_count, FLOOR(RANDOM() * 20) + 1),
    view_count = COALESCE(view_count, FLOOR(RANDOM() * 100) + 10),
    like_count = COALESCE(like_count, FLOOR(RANDOM() * 10) + 1),
    average_rating = COALESCE(average_rating, ROUND((RANDOM() * 2 + 3)::numeric, 1))
WHERE is_active IS NULL OR NOT is_active;
