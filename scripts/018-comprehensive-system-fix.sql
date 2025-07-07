-- Comprehensive system fix and enhancements

-- Drop existing problematic tables and recreate
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS product_likes CASCADE;
DROP TABLE IF EXISTS seller_applications CASCADE;
DROP TABLE IF EXISTS admin_messages CASCADE;

-- Enhanced users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS seller_rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_sales INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT NOW();

-- Update existing users with usernames if they don't have them
UPDATE users 
SET username = LOWER(REPLACE(full_name, ' ', '_')) || '_' || SUBSTRING(id::text, 1, 8)
WHERE username IS NULL AND full_name IS NOT NULL;

-- Enhanced products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS popularity_score DECIMAL(5,2) DEFAULT 0;

-- Create favorites table
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Create product likes table
CREATE TABLE product_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Enhanced conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) DEFAULT 'direct', -- 'direct', 'support', 'group'
    title VARCHAR(255),
    participants JSONB DEFAULT '[]',
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    last_message_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'file', 'system'
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    reply_to UUID REFERENCES messages(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Seller applications table
CREATE TABLE seller_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    company_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(50) NOT NULL,
    experience_years INTEGER DEFAULT 0,
    description TEXT,
    documents JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    admin_notes TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Admin messages and notifications
CREATE TABLE admin_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL, -- 'seller_application', 'product_approval', 'contact', etc.
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'read', 'resolved'
    priority VARCHAR(10) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    created_by UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Broadcast messages for admin
CREATE TABLE broadcast_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_audience VARCHAR(20) DEFAULT 'all', -- 'all', 'sellers', 'buyers', 'verified'
    sent_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seller analytics
CREATE TABLE seller_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    orders INTEGER DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0,
    products_sold INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(seller_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
CREATE INDEX IF NOT EXISTS idx_users_is_verified_seller ON users(is_verified_seller);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_popularity_score ON products(popularity_score DESC);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_product_id ON favorites(product_id);

CREATE INDEX IF NOT EXISTS idx_product_likes_user_id ON product_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_product_likes_product_id ON product_likes(product_id);

CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_messages_status ON admin_messages(status);
CREATE INDEX IF NOT EXISTS idx_admin_messages_type ON admin_messages(type);
CREATE INDEX IF NOT EXISTS idx_admin_messages_created_at ON admin_messages(created_at DESC);

-- Functions for better functionality

-- Function to update product popularity
CREATE OR REPLACE FUNCTION update_product_popularity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products 
    SET popularity_score = (
        (like_count * 2) + 
        (order_count * 3) + 
        (view_count * 0.1) + 
        (average_rating * 10)
    )
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for popularity updates
DROP TRIGGER IF EXISTS trigger_update_popularity_on_like ON product_likes;
CREATE TRIGGER trigger_update_popularity_on_like
    AFTER INSERT OR DELETE ON product_likes
    FOR EACH ROW EXECUTE FUNCTION update_product_popularity();

DROP TRIGGER IF EXISTS trigger_update_popularity_on_order ON orders;
CREATE TRIGGER trigger_update_popularity_on_order
    AFTER INSERT ON orders
    FOR EACH ROW EXECUTE FUNCTION update_product_popularity();

-- Function to get user stats
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_products', COALESCE((SELECT COUNT(*) FROM products WHERE seller_id = p_user_id), 0),
        'total_orders', COALESCE((SELECT COUNT(*) FROM orders WHERE user_id = p_user_id), 0),
        'total_sales', COALESCE((SELECT COUNT(*) FROM orders o JOIN products p ON o.product_id = p.id WHERE p.seller_id = p_user_id), 0),
        'total_revenue', COALESCE((SELECT SUM(o.total_amount) FROM orders o JOIN products p ON o.product_id = p.id WHERE p.seller_id = p_user_id AND o.status = 'completed'), 0),
        'avg_rating', COALESCE((SELECT AVG(average_rating) FROM products WHERE seller_id = p_user_id), 0),
        'total_views', COALESCE((SELECT SUM(view_count) FROM products WHERE seller_id = p_user_id), 0),
        'followers_count', 0,
        'following_count', 0
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to create conversation
CREATE OR REPLACE FUNCTION create_or_get_conversation(
    p_user1_id UUID,
    p_user2_id UUID,
    p_type VARCHAR DEFAULT 'direct'
)
RETURNS UUID AS $$
DECLARE
    conversation_id UUID;
    participants_array JSONB;
BEGIN
    -- Create participants array
    participants_array := jsonb_build_array(p_user1_id, p_user2_id);
    
    -- Try to find existing conversation
    SELECT id INTO conversation_id
    FROM conversations
    WHERE type = p_type
    AND participants @> jsonb_build_array(p_user1_id)
    AND participants @> jsonb_build_array(p_user2_id)
    AND jsonb_array_length(participants) = 2;
    
    -- If not found, create new conversation
    IF conversation_id IS NULL THEN
        INSERT INTO conversations (type, participants, created_by)
        VALUES (p_type, participants_array, p_user1_id)
        RETURNING id INTO conversation_id;
    END IF;
    
    RETURN conversation_id;
END;
$$ LANGUAGE plpgsql;

-- Function to connect telegram to user
CREATE OR REPLACE FUNCTION connect_telegram_to_user(
    p_email VARCHAR,
    p_telegram_id BIGINT
)
RETURNS JSON AS $$
DECLARE
    user_record RECORD;
    result JSON;
BEGIN
    -- Find user by email
    SELECT * INTO user_record FROM users WHERE email = p_email;
    
    IF user_record IS NULL THEN
        result := json_build_object('success', false, 'message', 'User not found');
    ELSE
        -- Update telegram_id
        UPDATE users 
        SET telegram_id = p_telegram_id, updated_at = NOW()
        WHERE id = user_record.id;
        
        result := json_build_object(
            'success', true, 
            'message', 'Connected successfully',
            'username', user_record.username,
            'full_name', user_record.full_name
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Insert sample admin user if not exists
INSERT INTO users (
    email, 
    full_name, 
    username,
    phone, 
    is_admin, 
    is_verified_seller,
    telegram_id
) VALUES (
    'admin@globalmarket.uz',
    'GlobalMarket Admin',
    'admin',
    '+998958657500',
    true,
    true,
    123456789
) ON CONFLICT (email) DO NOTHING;

-- Update existing products popularity
UPDATE products SET popularity_score = (
    (like_count * 2) + 
    (order_count * 3) + 
    (view_count * 0.1) + 
    (average_rating * 10)
);

-- Enable RLS (Row Level Security) for better security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own conversations" ON conversations
    FOR SELECT USING (
        auth.uid()::text = ANY(SELECT jsonb_array_elements_text(participants))
        OR auth.uid() IN (SELECT id FROM users WHERE is_admin = true)
    );

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE auth.uid()::text = ANY(SELECT jsonb_array_elements_text(participants))
            OR auth.uid() IN (SELECT id FROM users WHERE is_admin = true)
        )
    );

CREATE POLICY "Users can send messages to their conversations" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE auth.uid()::text = ANY(SELECT jsonb_array_elements_text(participants))
        )
    );

CREATE POLICY "Users can manage their own favorites" ON favorites
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own likes" ON product_likes
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());
