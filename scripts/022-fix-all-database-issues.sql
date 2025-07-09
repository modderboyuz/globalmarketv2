-- Fix all database issues and create proper schema

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Public can view seller profiles" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Fix users table - remove address column if it exists and add missing columns
ALTER TABLE users DROP COLUMN IF EXISTS address;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS seller_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_sales INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

-- Fix categories table - ensure it has 'name' column not 'name_uz'
ALTER TABLE categories DROP COLUMN IF EXISTS name_uz;
ALTER TABLE categories DROP COLUMN IF EXISTS name_en;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;

-- Update existing categories data
UPDATE categories SET name = 'Kitoblar' WHERE slug = 'kitoblar' AND (name IS NULL OR name = '');
UPDATE categories SET name = 'Daftar va qalam' WHERE slug = 'daftar-qalam' AND (name IS NULL OR name = '');
UPDATE categories SET name = 'Maktab buyumlari' WHERE slug = 'maktab-buyumlari' AND (name IS NULL OR name = '');
UPDATE categories SET name = 'Ofis jihozlari' WHERE slug = 'ofis-jihozlari' AND (name IS NULL OR name = '');
UPDATE categories SET name = 'Boshqa' WHERE slug = 'boshqa' AND (name IS NULL OR name = '');

-- Fix products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_delivery BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_price DECIMAL(10,2) DEFAULT 0;

-- Create or update conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT DEFAULT 'direct',
    title TEXT,
    product_id UUID REFERENCES products(id),
    buyer_id UUID REFERENCES users(id),
    seller_id UUID REFERENCES users(id),
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create or update messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    reply_to UUID REFERENCES messages(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create or update admin_messages table
CREATE TABLE IF NOT EXISTS admin_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'normal',
    admin_response TEXT,
    created_by UUID REFERENCES users(id),
    handled_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create seller_applications table
CREATE TABLE IF NOT EXISTS seller_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    company_name TEXT NOT NULL,
    business_type TEXT NOT NULL,
    experience_years INTEGER DEFAULT 0,
    description TEXT,
    status TEXT DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create product_views table for tracking views
CREATE TABLE IF NOT EXISTS product_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create product_reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive RLS policies for users
CREATE POLICY "Users can view public profiles" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Categories policies (public read)
CREATE POLICY "Anyone can view categories" ON categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON categories
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Products policies
CREATE POLICY "Anyone can view approved products" ON products
    FOR SELECT USING (is_active = true AND is_approved = true);

CREATE POLICY "Sellers can view own products" ON products
    FOR SELECT USING (seller_id = auth.uid());

CREATE POLICY "Sellers can insert own products" ON products
    FOR INSERT WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can update own products" ON products
    FOR UPDATE USING (seller_id = auth.uid());

-- Orders policies
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can create orders" ON orders
    FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Conversations policies
CREATE POLICY "Users can view own conversations" ON conversations
    FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view messages in own conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
        )
    );

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Admin messages policies
CREATE POLICY "Anyone can create admin messages" ON admin_messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view admin messages" ON admin_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

CREATE POLICY "Admins can update admin messages" ON admin_messages
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Seller applications policies
CREATE POLICY "Users can view own applications" ON seller_applications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create applications" ON seller_applications
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage applications" ON seller_applications
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Product views policies
CREATE POLICY "Anyone can create product views" ON product_views
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own product views" ON product_views
    FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

-- Product reviews policies
CREATE POLICY "Anyone can view approved reviews" ON product_reviews
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can create reviews" ON product_reviews
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reviews" ON product_reviews
    FOR UPDATE USING (user_id = auth.uid());

-- Create function to update product popularity
CREATE OR REPLACE FUNCTION update_product_popularity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products 
    SET popularity_score = (
        COALESCE(view_count, 0) * 1 + 
        COALESCE(like_count, 0) * 3 + 
        COALESCE(order_count, 0) * 5 +
        COALESCE(average_rating, 0) * 2
    )
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for popularity updates
DROP TRIGGER IF EXISTS update_product_popularity_on_view ON product_views;
CREATE TRIGGER update_product_popularity_on_view
    AFTER INSERT ON product_views
    FOR EACH ROW EXECUTE FUNCTION update_product_popularity();

DROP TRIGGER IF EXISTS update_product_popularity_on_like ON product_likes;
CREATE TRIGGER update_product_popularity_on_like
    AFTER INSERT OR DELETE ON product_likes
    FOR EACH ROW EXECUTE FUNCTION update_product_popularity();

-- Insert sample categories if they don't exist
INSERT INTO categories (name, slug, icon, is_active, sort_order) VALUES
('Kitoblar', 'kitoblar', '📚', true, 1),
('Daftar va qalam', 'daftar-qalam', '📝', true, 2),
('Maktab buyumlari', 'maktab-buyumlari', '🎒', true, 3),
('Ofis jihozlari', 'ofis-jihozlari', '🖥️', true, 4),
('Boshqa', 'boshqa', '📦', true, 5)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon;

-- Create admin user
INSERT INTO users (
    id,
    email, 
    full_name, 
    username,
    phone, 
    is_admin, 
    is_verified_seller,
    created_at
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin@globalmarket.uz',
    'GlobalMarket Admin',
    'admin',
    '+998958657500',
    true,
    true,
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    is_admin = true,
    is_verified_seller = true,
    phone = EXCLUDED.phone;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;
