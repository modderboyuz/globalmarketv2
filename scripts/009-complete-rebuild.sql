-- Drop all tables and recreate
DROP TABLE IF EXISTS cart CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS seller_applications CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE;

-- Create users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    telegram_id BIGINT UNIQUE,
    is_admin BOOLEAN DEFAULT FALSE,
    is_admin_full BOOLEAN DEFAULT FALSE,
    is_verified_seller BOOLEAN DEFAULT FALSE,
    company_name VARCHAR(255),
    seller_documents TEXT,
    verification_status VARCHAR(20) DEFAULT 'pending',
    seller_rating DECIMAL(3,2) DEFAULT 4.5,
    total_sales INTEGER DEFAULT 0,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categories table
CREATE TABLE categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name_uz VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(50),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    category_id UUID REFERENCES categories(id),
    seller_id UUID REFERENCES users(id),
    product_type VARCHAR(50) NOT NULL DEFAULT 'other',
    brand VARCHAR(100),
    author VARCHAR(100),
    isbn VARCHAR(20),
    stock_quantity INTEGER DEFAULT 0,
    order_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 4.5,
    is_popular BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    has_delivery BOOLEAN DEFAULT FALSE,
    delivery_price DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    product_id UUID REFERENCES products(id),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    order_type VARCHAR(20) DEFAULT 'immediate',
    anon_temp_id VARCHAR(100),
    delivery_address TEXT,
    delivery_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cart table
CREATE TABLE cart (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Create seller applications table
CREATE TABLE seller_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100),
    experience_years INTEGER,
    description TEXT,
    documents_url TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contact messages table
CREATE TABLE contact_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    message_type VARCHAR(50) DEFAULT 'general',
    subject VARCHAR(255),
    message TEXT NOT NULL,
    book_request_title VARCHAR(255),
    book_request_author VARCHAR(255),
    status VARCHAR(20) DEFAULT 'new',
    admin_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert categories
INSERT INTO categories (name_uz, name_en, slug, icon, sort_order) VALUES
('Kitoblar', 'Books', 'kitoblar', '📚', 1),
('Daftarlar', 'Notebooks', 'daftarlar', '📓', 2),
('Qalamlar', 'Pens', 'qalamlar', '🖊️', 3),
('Rangli qalamlar', 'Colored Pencils', 'rangli-qalamlar', '✏️', 4),
('Maktab buyumlari', 'School Supplies', 'maktab-buyumlari', '🎒', 5),
('Ofis buyumlari', 'Office Supplies', 'ofis-buyumlari', '💼', 6);

-- Create main GlobalMarket seller
INSERT INTO users (
    email,
    full_name,
    company_name,
    phone,
    is_verified_seller,
    verification_status,
    is_admin_full,
    seller_rating,
    total_sales
) VALUES (
    'admin@globalmarket.uz',
    'GlobalMarket Admin',
    'GlobalMarket.uz',
    '998901234567',
    TRUE,
    'approved',
    TRUE,
    5.0,
    1000
);

-- Get GlobalMarket seller ID and insert products
DO $$
DECLARE
    globalmarket_id UUID;
    kitoblar_id UUID;
    daftarlar_id UUID;
    qalamlar_id UUID;
    rangli_qalamlar_id UUID;
    maktab_id UUID;
    ofis_id UUID;
BEGIN
    SELECT id INTO globalmarket_id FROM users WHERE email = 'admin@globalmarket.uz';
    SELECT id INTO kitoblar_id FROM categories WHERE slug = 'kitoblar';
    SELECT id INTO daftarlar_id FROM categories WHERE slug = 'daftarlar';
    SELECT id INTO qalamlar_id FROM categories WHERE slug = 'qalamlar';
    SELECT id INTO rangli_qalamlar_id FROM categories WHERE slug = 'rangli-qalamlar';
    SELECT id INTO maktab_id FROM categories WHERE slug = 'maktab-buyumlari';
    SELECT id INTO ofis_id FROM categories WHERE slug = 'ofis-buyumlari';

    -- Insert sample products
    INSERT INTO products (name, description, price, image_url, category_id, seller_id, product_type, brand, author, stock_quantity, order_count, rating, is_popular, is_featured, has_delivery, delivery_price) VALUES
    -- Books
    ('O''tkan kunlar', 'Abdulla Qodiriyning mashhur romani. O''zbek adabiyotining eng yaxshi asarlaridan biri.', 25000, '/placeholder.svg?height=400&width=300', kitoblar_id, globalmarket_id, 'book', NULL, 'Abdulla Qodiriy', 50, 245, 4.8, TRUE, TRUE, TRUE, 5000),
    ('Mehrobdan chayon', 'Abdulla Qahhorning hikoyalar to''plami. Hayotiy va ta''sirli hikoyalar.', 18000, '/placeholder.svg?height=400&width=300', kitoblar_id, globalmarket_id, 'book', NULL, 'Abdulla Qahhor', 30, 189, 4.7, TRUE, FALSE, TRUE, 5000),
    ('Sariq devni minib', 'Xudoyberdi To''xtaboyevning bolalar uchun kitob.', 15000, '/placeholder.svg?height=400&width=300', kitoblar_id, globalmarket_id, 'book', NULL, 'Xudoyberdi To''xtaboyev', 40, 156, 4.6, TRUE, FALSE, TRUE, 5000),
    ('Ikki eshik orasi', 'O''tkir Hoshimovning mashhur romani.', 22000, '/placeholder.svg?height=400&width=300', kitoblar_id, globalmarket_id, 'book', NULL, 'O''tkir Hoshimov', 35, 134, 4.9, TRUE, TRUE, TRUE, 5000),
    
    -- Notebooks
    ('A4 Daftar Premium', 'Yuqori sifatli qog''oz, 96 varaq, chiziqli', 12000, '/placeholder.svg?height=400&width=300', daftarlar_id, globalmarket_id, 'notebook', 'GlobalMarket', NULL, 200, 567, 4.5, TRUE, TRUE, FALSE, 0),
    ('Matematika daftari', 'Katak daftar matematika darslari uchun, 48 varaq', 8000, '/placeholder.svg?height=400&width=300', daftarlar_id, globalmarket_id, 'notebook', 'GlobalMarket', NULL, 150, 423, 4.4, TRUE, FALSE, FALSE, 0),
    ('Ingliz tili daftari', 'Chiziqli daftar til darslari uchun', 9000, '/placeholder.svg?height=400&width=300', daftarlar_id, globalmarket_id, 'notebook', 'GlobalMarket', NULL, 180, 345, 4.6, TRUE, FALSE, FALSE, 0),
    ('Sketchbook A5', 'Rasm chizish uchun maxsus daftar', 25000, '/placeholder.svg?height=400&width=300', daftarlar_id, globalmarket_id, 'notebook', 'GlobalMarket', NULL, 75, 234, 4.7, TRUE, TRUE, FALSE, 0),
    
    -- Pens
    ('Pilot G2 Gel Pen', 'Yuqori sifatli gel qalam, silliq yozish', 8000, '/placeholder.svg?height=400&width=300', qalamlar_id, globalmarket_id, 'pen', 'Pilot', NULL, 100, 789, 4.8, TRUE, TRUE, FALSE, 0),
    ('BIC Cristal', 'Klassik plastik qalam, ishonchli', 3000, '/placeholder.svg?height=400&width=300', qalamlar_id, globalmarket_id, 'pen', 'BIC', NULL, 200, 654, 4.3, TRUE, FALSE, FALSE, 0),
    ('Uni-ball Signo', 'Premium gel qalam, professional', 15000, '/placeholder.svg?height=400&width=300', qalamlar_id, globalmarket_id, 'pen', 'Uni-ball', NULL, 80, 432, 4.9, TRUE, TRUE, FALSE, 0),
    ('Qalamlar to''plami', '10 ta turli rangli qalam to''plami', 25000, '/placeholder.svg?height=400&width=300', qalamlar_id, globalmarket_id, 'pen', 'GlobalMarket', NULL, 120, 345, 4.6, TRUE, FALSE, FALSE, 0),
    
    -- Colored Pencils
    ('Faber-Castell 24 rang', 'Professional rangli qalamlar to''plami', 45000, '/placeholder.svg?height=400&width=300', rangli_qalamlar_id, globalmarket_id, 'pencil', 'Faber-Castell', NULL, 60, 234, 4.9, TRUE, TRUE, FALSE, 0),
    ('Crayola 12 rang', 'Bolalar uchun rangli qalamlar', 18000, '/placeholder.svg?height=400&width=300', rangli_qalamlar_id, globalmarket_id, 'pencil', 'Crayola', NULL, 100, 456, 4.5, TRUE, FALSE, FALSE, 0),
    ('Staedtler Noris', 'Maktab uchun oddiy qalam', 2500, '/placeholder.svg?height=400&width=300', rangli_qalamlar_id, globalmarket_id, 'pencil', 'Staedtler', NULL, 300, 678, 4.4, TRUE, FALSE, FALSE, 0),
    
    -- School Supplies
    ('Maktab sumkasi', 'Katta va qulay maktab sumkasi', 85000, '/placeholder.svg?height=400&width=300', maktab_id, globalmarket_id, 'bag', 'GlobalMarket', NULL, 45, 123, 4.7, TRUE, TRUE, TRUE, 10000),
    ('Geometriya to''plami', 'Chizg''ich, burchak, sirkullar to''plami', 15000, '/placeholder.svg?height=400&width=300', maktab_id, globalmarket_id, 'geometry', 'GlobalMarket', NULL, 80, 234, 4.6, TRUE, FALSE, FALSE, 0),
    ('Kalkulyator', 'Ilmiy kalkulyator maktab uchun', 35000, '/placeholder.svg?height=400&width=300', maktab_id, globalmarket_id, 'calculator', 'Casio', NULL, 25, 167, 4.8, TRUE, TRUE, FALSE, 0),
    
    -- Office Supplies
    ('Fayl papka A4', 'Hujjatlar uchun plastik papka', 5000, '/placeholder.svg?height=400&width=300', ofis_id, globalmarket_id, 'folder', 'GlobalMarket', NULL, 150, 345, 4.3, TRUE, FALSE, FALSE, 0),
    ('Skrepkalar to''plami', '100 ta skrepka to''plami', 8000, '/placeholder.svg?height=400&width=300', ofis_id, globalmarket_id, 'clips', 'GlobalMarket', NULL, 200, 456, 4.2, TRUE, FALSE, FALSE, 0),
    ('Stiker yopishqoqlar', 'Turli rangli stiker to''plami', 12000, '/placeholder.svg?height=400&width=300', ofis_id, globalmarket_id, 'stickers', 'GlobalMarket', NULL, 100, 234, 4.5, TRUE, FALSE, FALSE, 0);

END $$;

-- Create indexes
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_products_type ON products(product_type);
CREATE INDEX idx_products_popular ON products(is_popular);
CREATE INDEX idx_products_featured ON products(is_featured);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_cart_user ON cart(user_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_product ON orders(product_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_users_telegram ON users(telegram_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_seller_applications_status ON seller_applications(status);
CREATE INDEX idx_contact_messages_status ON contact_messages(status);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);
CREATE POLICY "Users can insert their own products" ON products FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Users can update their own products" ON products FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Users can view their own cart" ON cart FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert into their own cart" ON cart FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cart" ON cart FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete from their own cart" ON cart FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can view seller applications" ON seller_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert seller applications" ON seller_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own contact messages" ON contact_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert contact messages" ON contact_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
