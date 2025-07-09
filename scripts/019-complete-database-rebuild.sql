-- Complete database rebuild with all fixes
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    username VARCHAR(50) UNIQUE,
    phone VARCHAR(20),
    company_name VARCHAR(255),
    bio TEXT,
    avatar_url TEXT,
    website_url TEXT,
    social_links JSONB DEFAULT '{}',
    is_admin BOOLEAN DEFAULT false,
    is_verified_seller BOOLEAN DEFAULT false,
    seller_rating DECIMAL(3,2) DEFAULT 0,
    total_sales INTEGER DEFAULT 0,
    verification_status VARCHAR(20) DEFAULT 'pending',
    telegram_id BIGINT UNIQUE,
    last_active TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(50) DEFAULT '📦',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    image_url TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stock_quantity INTEGER DEFAULT 0,
    product_type VARCHAR(50) DEFAULT 'general',
    brand VARCHAR(100),
    author VARCHAR(100),
    isbn VARCHAR(20),
    publisher VARCHAR(100),
    publication_year INTEGER,
    language VARCHAR(50) DEFAULT 'uzbek',
    condition VARCHAR(20) DEFAULT 'new',
    has_delivery BOOLEAN DEFAULT false,
    delivery_price DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_approved BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    average_rating DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    order_count INTEGER DEFAULT 0,
    popularity_score DECIMAL(8,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    total_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    order_type VARCHAR(20) DEFAULT 'website',
    anon_temp_id VARCHAR(100),
    notes TEXT,
    delivery_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) DEFAULT 'direct',
    title VARCHAR(255),
    buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active',
    is_active BOOLEAN DEFAULT true,
    last_message_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    reply_to UUID REFERENCES messages(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Admin messages table
CREATE TABLE admin_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending',
    priority VARCHAR(10) DEFAULT 'normal',
    admin_response TEXT,
    created_by UUID REFERENCES users(id),
    handled_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Favorites table
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Product likes table
CREATE TABLE product_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Seller applications table
CREATE TABLE seller_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    company_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(50) NOT NULL,
    experience_years INTEGER DEFAULT 0,
    description TEXT,
    documents JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Ads table
CREATE TABLE ads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    link_url TEXT,
    click_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP DEFAULT NOW(),
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Contact messages table
CREATE TABLE contact_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    admin_response TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sell requests table
CREATE TABLE sell_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    location VARCHAR(255),
    contact_phone VARCHAR(20) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    admin_response TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Order notifications table
CREATE TABLE order_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending',
    seller_response TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Broadcast messages table
CREATE TABLE broadcast_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_audience VARCHAR(20) DEFAULT 'all',
    sent_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_is_admin ON users(is_admin);
CREATE INDEX idx_users_is_verified_seller ON users(is_verified_seller);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_is_active ON categories(is_active);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_seller_id ON products(seller_id);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_is_approved ON products(is_approved);
CREATE INDEX idx_products_popularity_score ON products(popularity_score DESC);
CREATE INDEX idx_products_created_at ON products(created_at DESC);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_product_id ON orders(product_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

CREATE INDEX idx_conversations_buyer_id ON conversations(buyer_id);
CREATE INDEX idx_conversations_seller_id ON conversations(seller_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

CREATE INDEX idx_admin_messages_status ON admin_messages(status);
CREATE INDEX idx_admin_messages_type ON admin_messages(type);
CREATE INDEX idx_admin_messages_created_at ON admin_messages(created_at DESC);

-- Functions
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

-- Triggers
CREATE TRIGGER trigger_update_popularity_on_like
    AFTER INSERT OR DELETE ON product_likes
    FOR EACH ROW EXECUTE FUNCTION update_product_popularity();

CREATE TRIGGER trigger_update_popularity_on_order
    AFTER INSERT ON orders
    FOR EACH ROW EXECUTE FUNCTION update_product_popularity();

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
    SELECT * INTO user_record FROM users WHERE email = p_email;
    
    IF user_record IS NULL THEN
        result := json_build_object('success', false, 'message', 'User not found');
    ELSE
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

-- Insert sample data
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

-- Insert categories
INSERT INTO categories (name, slug, icon, description) VALUES
('Kitoblar', 'kitoblar', '📚', 'Darsliklar, badiy adabiyotlar va boshqa kitoblar'),
('Maktab buyumlari', 'maktab-buyumlari', '🎒', 'Maktab uchun kerakli buyumlar'),
('Ofis jihozlari', 'ofis-jihozlari', '🖊️', 'Ofis uchun kerakli jihozlar'),
('Elektronika', 'elektronika', '💻', 'Kompyuter va elektronik jihozlar'),
('Kiyim-kechak', 'kiyim-kechak', '👕', 'Turli xil kiyim-kechaklar'),
('Sport buyumlari', 'sport-buyumlari', '⚽', 'Sport uchun kerakli buyumlar')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample products
INSERT INTO products (
    name, 
    description, 
    price, 
    category_id, 
    seller_id, 
    stock_quantity,
    is_active,
    is_approved,
    average_rating,
    order_count,
    view_count
) 
SELECT 
    'Matematika darsligi ' || generate_series,
    'Maktab uchun matematika darsligi',
    25000 + (random() * 50000)::int,
    (SELECT id FROM categories WHERE slug = 'kitoblar'),
    (SELECT id FROM users WHERE is_admin = true LIMIT 1),
    (10 + random() * 90)::int,
    true,
    true,
    (3 + random() * 2)::decimal(3,2),
    (random() * 100)::int,
    (random() * 1000)::int
FROM generate_series(1, 20);

INSERT INTO products (
    name, 
    description, 
    price, 
    category_id, 
    seller_id, 
    stock_quantity,
    is_active,
    is_approved,
    average_rating,
    order_count,
    view_count
) 
SELECT 
    'Ruchka ' || generate_series,
    'Yozish uchun ruchka',
    2000 + (random() * 8000)::int,
    (SELECT id FROM categories WHERE slug = 'maktab-buyumlari'),
    (SELECT id FROM users WHERE is_admin = true LIMIT 1),
    (50 + random() * 200)::int,
    true,
    true,
    (3 + random() * 2)::decimal(3,2),
    (random() * 50)::int,
    (random() * 500)::int
FROM generate_series(1, 15);

-- Update popularity scores
UPDATE products SET popularity_score = (
    (like_count * 2) + 
    (order_count * 3) + 
    (view_count * 0.1) + 
    (average_rating * 10)
);

-- Insert sample ads
INSERT INTO ads (title, description, image_url, link_url, is_active) VALUES
('Yangi kitoblar chegirmada!', 'Barcha kitoblarga 20% chegirma', '/placeholder.svg?height=200&width=400', '#', true),
('Maktab buyumlari aksiyasi', 'Maktab buyumlariga katta chegirma', '/placeholder.svg?height=200&width=400', '#', true);

-- Insert sample admin messages
INSERT INTO admin_messages (type, title, content, data, created_by) VALUES
('system_message', 'Yangi foydalanuvchi', 'Yangi foydalanuvchi ro''yxatdan o''tdi', '{"user_id": "' || (SELECT id FROM users WHERE is_admin = true LIMIT 1) || '"}', (SELECT id FROM users WHERE is_admin = true LIMIT 1)),
('contact', 'Murojaat', 'Savolim bor', '{"name": "Test User", "phone": "+998901234567", "contact_id": "' || uuid_generate_v4() || '"}', (SELECT id FROM users WHERE is_admin = true LIMIT 1)),
('sell_request', 'Mahsulot sotish', 'Kitob sotmoqchiman', '{"price": 50000, "user_id": "' || (SELECT id FROM users WHERE is_admin = true LIMIT 1) || '", "location": "Toshkent", "product_name": "Matematika kitob", "contact_phone": "+998901234567", "sell_request_id": "' || uuid_generate_v4() || '"}', (SELECT id FROM users WHERE is_admin = true LIMIT 1));
