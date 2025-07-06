-- Complete system upgrade with all new features

-- Drop existing tables if they exist (in correct order to avoid foreign key conflicts)
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS ads CASCADE;
DROP TABLE IF EXISTS product_comments CASCADE;
DROP TABLE IF EXISTS seller_applications CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE;

-- Create ads table for advertisement management
CREATE TABLE ads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    ad_link TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    click_count INTEGER DEFAULT 0
);

-- Create conversations table for real-time messaging
CREATE TABLE conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, buyer_id, seller_id)
);

-- Create messages table for real-time messaging
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create favorites table
CREATE TABLE favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Create product_comments table
CREATE TABLE product_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reviews table for order reviews
CREATE TABLE reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(order_id, product_id, user_id)
);

-- Update contact_messages table
CREATE TABLE contact_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'general',
    book_request_title VARCHAR(255),
    book_request_author VARCHAR(255),
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
    admin_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update seller_applications table
CREATE TABLE seller_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    full_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    business_type VARCHAR(100),
    experience_years INTEGER DEFAULT 0,
    description TEXT,
    documents_url TEXT[],
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update users table with new fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified_seller BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS seller_rating DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_sales INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_type VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin_full BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending';

-- Update products table with new fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE products ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_delivery BOOLEAN DEFAULT true;

-- Update orders table with new fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_confirmed_by_seller BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_confirmed_by_buyer BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id ON conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_product_id ON conversations(product_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_product_id ON favorites(product_id);
CREATE INDEX IF NOT EXISTS idx_product_comments_product_id ON product_comments(product_id);
CREATE INDEX IF NOT EXISTS idx_product_comments_user_id ON product_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_seller_id ON reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_ads_is_active ON ads(is_active);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- Create functions for updating counters
CREATE OR REPLACE FUNCTION update_product_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE products 
        SET like_count = like_count + 1 
        WHERE id = NEW.product_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE products 
        SET like_count = GREATEST(like_count - 1, 0) 
        WHERE id = OLD.product_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_product_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE products 
        SET comment_count = comment_count + 1 
        WHERE id = NEW.product_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE products 
        SET comment_count = GREATEST(comment_count - 1, 0) 
        WHERE id = OLD.product_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products 
    SET average_rating = (
        SELECT COALESCE(AVG(rating), 0) 
        FROM product_comments 
        WHERE product_id = NEW.product_id AND is_approved = true
    )
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET updated_at = NOW() 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_product_like_count ON favorites;
CREATE TRIGGER trigger_update_product_like_count
    AFTER INSERT OR DELETE ON favorites
    FOR EACH ROW EXECUTE FUNCTION update_product_like_count();

DROP TRIGGER IF EXISTS trigger_update_product_comment_count ON product_comments;
CREATE TRIGGER trigger_update_product_comment_count
    AFTER INSERT OR DELETE ON product_comments
    FOR EACH ROW EXECUTE FUNCTION update_product_comment_count();

DROP TRIGGER IF EXISTS trigger_update_product_rating ON product_comments;
CREATE TRIGGER trigger_update_product_rating
    AFTER INSERT OR UPDATE ON product_comments
    FOR EACH ROW EXECUTE FUNCTION update_product_rating();

DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON messages;
CREATE TRIGGER trigger_update_conversation_timestamp
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- Enable RLS (Row Level Security)
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_applications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Ads policies (public read, admin write)
CREATE POLICY "Public can view active ads" ON ads FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage ads" ON ads FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.is_admin = true OR users.is_admin_full = true))
);

-- Conversations policies
CREATE POLICY "Users can view their conversations" ON conversations FOR SELECT USING (
    buyer_id = auth.uid() OR seller_id = auth.uid()
);
CREATE POLICY "Users can create conversations" ON conversations FOR INSERT WITH CHECK (
    buyer_id = auth.uid() OR seller_id = auth.uid()
);
CREATE POLICY "Users can update their conversations" ON conversations FOR UPDATE USING (
    buyer_id = auth.uid() OR seller_id = auth.uid()
);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM conversations 
        WHERE conversations.id = messages.conversation_id 
        AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
    )
);
CREATE POLICY "Users can send messages in their conversations" ON messages FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM conversations 
        WHERE conversations.id = conversation_id 
        AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
    )
);

-- Favorites policies
CREATE POLICY "Users can manage their favorites" ON favorites FOR ALL USING (user_id = auth.uid());

-- Product comments policies
CREATE POLICY "Anyone can view approved comments" ON product_comments FOR SELECT USING (is_approved = true);
CREATE POLICY "Authenticated users can create comments" ON product_comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own comments" ON product_comments FOR UPDATE USING (user_id = auth.uid());

-- Reviews policies
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews for their orders" ON reviews FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id AND orders.user_id = auth.uid())
);

-- Contact messages policies
CREATE POLICY "Users can view their own messages" ON contact_messages FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.is_admin = true OR users.is_admin_full = true))
);
CREATE POLICY "Anyone can create contact messages" ON contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update contact messages" ON contact_messages FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.is_admin = true OR users.is_admin_full = true))
);

-- Seller applications policies
CREATE POLICY "Users can view their own applications" ON seller_applications FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.is_admin = true OR users.is_admin_full = true))
);
CREATE POLICY "Authenticated users can create applications" ON seller_applications FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can update applications" ON seller_applications FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.is_admin = true OR users.is_admin_full = true))
);

-- Insert sample ads
INSERT INTO ads (title, description, image_url, ad_link, is_active) VALUES
('Yangi kitoblar to''plami', 'Eng sara kitoblarni arzon narxlarda', 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&h=250&fit=crop', 'https://example.com/books', true),
('Maktab buyumlari aksiyasi', 'Barcha maktab buyumlariga 20% chegirma', 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=1200&h=250&fit=crop', 'https://example.com/school-supplies', true);

-- Create admin user with phone +998958657500
INSERT INTO users (id, email, full_name, phone, is_admin, is_admin_full, telegram_id) 
VALUES (
    gen_random_uuid(),
    'admin@globalmarket.uz',
    'GlobalMarket Admin',
    '+998958657500',
    true,
    true,
    6295092422
) ON CONFLICT (email) DO UPDATE SET
    phone = EXCLUDED.phone,
    is_admin = EXCLUDED.is_admin,
    is_admin_full = EXCLUDED.is_admin_full,
    telegram_id = EXCLUDED.telegram_id;

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
