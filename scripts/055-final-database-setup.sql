-- Final database setup with all required tables and functions

-- Ensure all tables exist with correct structure
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    full_name TEXT,
    phone TEXT,
    address TEXT,
    username TEXT UNIQUE,
    avatar_url TEXT,
    type TEXT DEFAULT 'email',
    is_seller BOOLEAN DEFAULT FALSE,
    is_verified_seller BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    telegram_id BIGINT UNIQUE,
    telegram_username TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT DEFAULT '📦',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    title TEXT,
    description TEXT,
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    delivery_price DECIMAL(12,2) DEFAULT 0,
    has_delivery BOOLEAN DEFAULT FALSE,
    has_warranty BOOLEAN DEFAULT FALSE,
    warranty_period TEXT,
    has_return BOOLEAN DEFAULT FALSE,
    return_period TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    stock_quantity INTEGER DEFAULT 0,
    images TEXT[] DEFAULT '{}',
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    order_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    is_approved BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    delivery_address TEXT,
    delivery_phone TEXT,
    order_type TEXT DEFAULT 'website',
    anon_temp_id TEXT,
    status TEXT DEFAULT 'pending',
    is_agree BOOLEAN DEFAULT FALSE,
    is_client_went BOOLEAN DEFAULT FALSE,
    is_client_claimed BOOLEAN DEFAULT FALSE,
    pickup_address TEXT,
    seller_notes TEXT,
    client_notes TEXT,
    stage INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cart table
CREATE TABLE IF NOT EXISTS cart (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Contact messages table
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT,
    phone TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    admin_response TEXT,
    book_request_title TEXT,
    book_request_author TEXT,
    full_name TEXT,
    message_type TEXT,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seller applications table
CREATE TABLE IF NOT EXISTS seller_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_type TEXT,
    business_address TEXT,
    business_phone TEXT,
    business_description TEXT,
    documents TEXT[],
    status TEXT DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Neighborhoods table
CREATE TABLE IF NOT EXISTS neighborhoods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    district TEXT DEFAULT 'G''uzor',
    region TEXT DEFAULT 'Qashqadaryo',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert neighborhoods
INSERT INTO neighborhoods (name) VALUES
('Gulshan'), ('Eskibog'''), ('Chaqar'), ('Jarariq'), ('Yakkadaraxt'), 
('Yonqishloq'), ('Guliston'), ('Istiqbol'), ('Do''ltali'), ('Toshguzar'), 
('Chugurtma'), ('Fayziobod'), ('Mevazor'), ('Do''stlik'), ('Navro''z'), 
('Sherali'), ('Dashtobod'), ('Yangihayot'), ('Pachkamar'), ('Chorvador'), 
('Obihayot'), ('Omon ota'), ('Xalkabod'), ('Yangiobod'), ('Batosh'), 
('Mo''minobod'), ('Apardi'), ('Bo''ston'), ('Xumdon'), ('Avg''onbog'''), 
('Yarg''unchi'), ('Mustaqillik'), ('Chanoq'), ('Zarbdor'), ('Qovchin'), 
('Sovlig''ar'), ('Shakarbuloq'), ('Yangikent'), ('Sovbog'''), ('Tinchlik'), 
('A.Temur'), ('Obod'), ('Mehnatobod'), ('Cho''michli'), ('Tengdosh'), 
('Qorako''l'), ('Jonbuloq'), ('Eshonquduq'), ('Buyuk karvon'), ('Paxtazor'), 
('Xo''jaguzar')
ON CONFLICT (name) DO NOTHING;

-- Insert default categories
INSERT INTO categories (name, slug, icon, description) VALUES
('Kitoblar', 'kitoblar', '📚', 'Barcha turdagi kitoblar'),
('Elektronika', 'elektronika', '📱', 'Elektronik qurilmalar'),
('Kiyim', 'kiyim', '👕', 'Erkaklar va ayollar kiyimi'),
('Uy-ro''zg''or', 'uy-rozgor', '🏠', 'Uy uchun buyumlar'),
('Sport', 'sport', '⚽', 'Sport anjomlari'),
('Go''zallik', 'gozallik', '💄', 'Go''zallik mahsulotlari'),
('Boshqa', 'boshqa', '📦', 'Boshqa kategoriyalar')
ON CONFLICT (slug) DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;

-- Create essential functions
CREATE OR REPLACE FUNCTION increment_view_count(product_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE products 
    SET view_count = COALESCE(view_count, 0) + 1,
        updated_at = NOW()
    WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_like_toggle(product_id_param UUID, user_id_param UUID)
RETURNS JSON AS $$
DECLARE
    existing_like_id UUID;
    current_likes_count INTEGER;
    is_liked BOOLEAN;
BEGIN
    SELECT id INTO existing_like_id 
    FROM likes 
    WHERE product_id = product_id_param AND user_id = user_id_param;
    
    IF existing_like_id IS NOT NULL THEN
        DELETE FROM likes WHERE id = existing_like_id;
        is_liked := false;
    ELSE
        INSERT INTO likes (product_id, user_id) 
        VALUES (product_id_param, user_id_param);
        is_liked := true;
    END IF;
    
    SELECT COUNT(*) INTO current_likes_count 
    FROM likes 
    WHERE product_id = product_id_param;
    
    UPDATE products 
    SET like_count = current_likes_count,
        updated_at = NOW()
    WHERE id = product_id_param;
    
    RETURN json_build_object(
        'success', true,
        'liked', is_liked,
        'like_count', current_likes_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_order(
    product_id_param UUID,
    full_name_param TEXT,
    phone_param TEXT,
    address_param TEXT,
    quantity_param INTEGER,
    user_id_param UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    product_record RECORD;
    order_id UUID;
    total_amount DECIMAL(12,2);
BEGIN
    SELECT * INTO product_record 
    FROM products 
    WHERE id = product_id_param AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Mahsulot topilmadi');
    END IF;
    
    IF product_record.stock_quantity < quantity_param THEN
        RETURN json_build_object('success', false, 'error', 'Yetarli mahsulot yo''q');
    END IF;
    
    total_amount := product_record.price * quantity_param;
    
    INSERT INTO orders (
        user_id, product_id, full_name, phone, address, 
        quantity, total_amount, status, stage
    ) VALUES (
        user_id_param, product_id_param, full_name_param, 
        phone_param, address_param, quantity_param, 
        total_amount, 'pending', 1
    ) RETURNING id INTO order_id;
    
    UPDATE products 
    SET stock_quantity = stock_quantity - quantity_param,
        order_count = COALESCE(order_count, 0) + 1,
        updated_at = NOW()
    WHERE id = product_id_param;
    
    RETURN json_build_object(
        'success', true,
        'order_id', order_id,
        'total_amount', total_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT SELECT ON categories, products, neighborhoods TO anon;
