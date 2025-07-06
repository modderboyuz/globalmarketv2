-- Enhanced messages system for order notifications and seller communications
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order notifications table
CREATE TABLE IF NOT EXISTS order_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    seller_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Ads table for admin management
CREATE TABLE IF NOT EXISTS ads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    link_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    click_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Function to create conversation when order is placed
CREATE OR REPLACE FUNCTION create_order_conversation()
RETURNS TRIGGER AS $$
BEGIN
    -- Create conversation between buyer and seller
    INSERT INTO conversations (product_id, buyer_id, seller_id)
    SELECT NEW.product_id, NEW.user_id, p.seller_id
    FROM products p
    WHERE p.id = NEW.product_id
    ON CONFLICT DO NOTHING;
    
    -- Create order notification for seller
    INSERT INTO order_notifications (order_id, seller_id, buyer_id)
    SELECT NEW.id, p.seller_id, NEW.user_id
    FROM products p
    WHERE p.id = NEW.product_id;
    
    -- Send message to seller about new order
    INSERT INTO messages (conversation_id, sender_id, message, message_type, metadata)
    SELECT 
        c.id,
        NEW.user_id,
        'Yangi buyurtma: ' || p.name || ' - ' || NEW.total_amount::text || ' so''m',
        'order_notification',
        jsonb_build_object(
            'order_id', NEW.id,
            'product_name', p.name,
            'quantity', NEW.quantity,
            'total_amount', NEW.total_amount,
            'customer_name', NEW.full_name,
            'customer_phone', NEW.phone,
            'customer_address', NEW.address
        )
    FROM conversations c
    JOIN products p ON p.id = c.product_id
    WHERE c.product_id = NEW.product_id 
    AND c.buyer_id = NEW.user_id 
    AND c.seller_id = p.seller_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order notifications
DROP TRIGGER IF EXISTS order_notification_trigger ON orders;
CREATE TRIGGER order_notification_trigger
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION create_order_conversation();

-- Function to handle order approval/rejection
CREATE OR REPLACE FUNCTION handle_order_response()
RETURNS TRIGGER AS $$
BEGIN
    -- Send message to buyer about seller's response
    INSERT INTO messages (conversation_id, sender_id, message, message_type, metadata)
    SELECT 
        c.id,
        NEW.seller_id,
        CASE 
            WHEN NEW.status = 'approved' THEN 'Buyurtmangiz tasdiqlandi! Tez orada aloqaga chiqamiz.'
            WHEN NEW.status = 'rejected' THEN 'Buyurtmangiz rad etildi. Sabab: ' || COALESCE(NEW.seller_response, 'Sabab ko''rsatilmagan')
        END,
        'order_response',
        jsonb_build_object(
            'order_id', NEW.order_id,
            'status', NEW.status,
            'seller_response', NEW.seller_response
        )
    FROM conversations c
    WHERE c.buyer_id = NEW.buyer_id AND c.seller_id = NEW.seller_id;
    
    -- Update order status
    UPDATE orders 
    SET status = CASE 
        WHEN NEW.status = 'approved' THEN 'processing'
        WHEN NEW.status = 'rejected' THEN 'cancelled'
        ELSE status
    END
    WHERE id = NEW.order_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order responses
DROP TRIGGER IF EXISTS order_response_trigger ON order_notifications;
CREATE TRIGGER order_response_trigger
    AFTER UPDATE ON order_notifications
    FOR EACH ROW
    WHEN (OLD.status = 'pending' AND NEW.status != 'pending')
    EXECUTE FUNCTION handle_order_response();

-- Insert sample ads
INSERT INTO ads (title, description, image_url, link_url, created_by) VALUES
('GlobalMarket - Eng yaxshi narxlar!', 'Barcha mahsulotlarga chegirmalar', '/placeholder.svg?height=200&width=800', 'https://globalmarketshop.uz/products', (SELECT id FROM users WHERE is_admin = true LIMIT 1)),
('Yangi mahsulotlar keldi!', 'Eng so''ngi kitoblar va maktab buyumlari', '/placeholder.svg?height=200&width=800', 'https://globalmarketshop.uz/products?new=true', (SELECT id FROM users WHERE is_admin = true LIMIT 1))
ON CONFLICT DO NOTHING;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_seller ON conversations(buyer_id, seller_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_order_notifications_seller ON order_notifications(seller_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_ads_active ON ads(is_active);
