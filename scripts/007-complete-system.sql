-- Drop existing tables and recreate with proper structure
DROP TABLE IF EXISTS cart CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- Create categories table
CREATE TABLE categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name_uz VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert categories
INSERT INTO categories (name_uz, name_en, slug, icon, sort_order) VALUES
('Kitoblar', 'Books', 'kitoblar', '📚', 1),
('Daftarlar', 'Notebooks', 'daftarlar', '📓', 2),
('Qalamlar', 'Pens', 'qalamlar', '🖊️', 3),
('Rangli qalamlar', 'Colored Pencils', 'rangli-qalamlar', '✏️', 4),
('Maktab buyumlari', 'School Supplies', 'maktab-buyumlari', '🎒', 5),
('Ofis buyumlari', 'Office Supplies', 'ofis-buyumlari', '💼', 6);

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
    has_delivery BOOLEAN DEFAULT FALSE,
    delivery_price DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
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

-- Update orders table
ALTER TABLE orders DROP COLUMN IF EXISTS book_id;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'immediate';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_phone VARCHAR(20);

-- Update users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified_seller BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS seller_documents TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin_full BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS seller_rating DECIMAL(3,2) DEFAULT 4.5;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_sales INTEGER DEFAULT 0;

-- Create main GlobalMarket seller
INSERT INTO users (
    id,
    email,
    full_name,
    company_name,
    is_verified_seller,
    verification_status,
    is_admin_full,
    seller_rating,
    total_sales,
    created_at
) VALUES (
    gen_random_uuid(),
    'admin@globalmarket.uz',
    'GlobalMarket Admin',
    'GlobalMarket.uz',
    TRUE,
    'approved',
    TRUE,
    5.0,
    1000,
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    is_verified_seller = TRUE,
    verification_status = 'approved',
    is_admin_full = TRUE,
    company_name = 'GlobalMarket.uz';

-- Get GlobalMarket seller ID
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
    INSERT INTO products (name, description, price, image_url, category_id, seller_id, product_type, brand, author, stock_quantity, order_count, rating, is_popular, is_featured) VALUES
    -- Books
    ('O''tkan kunlar', 'Abdulla Qodiriyning mashhur romani. O''zbek adabiyotining eng yaxshi asarlaridan biri.', 25000, '/placeholder.svg?height=400&width=300', kitoblar_id, globalmarket_id, 'book', NULL, 'Abdulla Qodiriy', 50, 245, 4.8, TRUE, TRUE),
    ('Mehrobdan chayon', 'Abdulla Qahhorning hikoyalar to''plami. Hayotiy va ta''sirli hikoyalar.', 18000, '/placeholder.svg?height=400&width=300', kitoblar_id, globalmarket_id, 'book', NULL, 'Abdulla Qahhor', 30, 189, 4.7, TRUE, FALSE),
    ('Sariq devni minib', 'Xudoyberdi To''xtaboyevning bolalar uchun kitob.', 15000, '/placeholder.svg?height=400&width=300', kitoblar_id, globalmarket_id, 'book', NULL, 'Xudoyberdi To''xtaboyev', 40, 156, 4.6, TRUE, FALSE),
    ('Ikki eshik orasi', 'O''tkir Hoshimovning mashhur romani.', 22000, '/placeholder.svg?height=400&width=300', kitoblar_id, globalmarket_id, 'book', NULL, 'O''tkir Hoshimov', 35, 134, 4.9, TRUE, TRUE),
    
    -- Notebooks
    ('A4 Daftar Premium', 'Yuqori sifatli qog''oz, 96 varaq, chiziqli', 12000, '/placeholder.svg?height=400&width=300', daftarlar_id, globalmarket_id, 'notebook', 'GlobalMarket', NULL, 200, 567, 4.5, TRUE, TRUE),
    ('Matematika daftari', 'Katak daftar matematika darslari uchun, 48 varaq', 8000, '/placeholder.svg?height=400&width=300', daftarlar_id, globalmarket_id, 'notebook', 'GlobalMarket', NULL, 150, 423, 4.4, TRUE, FALSE),
    ('Ingliz tili daftari', 'Chiziqli daftar til darslari uchun', 9000, '/placeholder.svg?height=400&width=300', daftarlar_id, globalmarket_id, 'notebook', 'GlobalMarket', NULL, 180, 345, 4.6, TRUE, FALSE),
    ('Sketchbook A5', 'Rasm chizish uchun maxsus daftar', 25000, '/placeholder.svg?height=400&width=300', daftarlar_id, globalmarket_id, 'notebook', 'GlobalMarket', NULL, 75, 234, 4.7, TRUE, TRUE),
    
    -- Pens
    ('Pilot G2 Gel Pen', 'Yuqori sifatli gel qalam, silliq yozish', 8000, '/placeholder.svg?height=400&width=300', qalamlar_id, globalmarket_id, 'pen', 'Pilot', NULL, 100, 789, 4.8, TRUE, TRUE),
    ('BIC Cristal', 'Klassik plastik qalam, ishonchli', 3000, '/placeholder.svg?height=400&width=300', qalamlar_id, globalmarket_id, 'pen', 'BIC', NULL, 200, 654, 4.3, TRUE, FALSE),
    ('Uni-ball Signo', 'Premium gel qalam, professional', 15000, '/placeholder.svg?height=400&width=300', qalamlar_id, globalmarket_id, 'pen', 'Uni-ball', NULL, 80, 432, 4.9, TRUE, TRUE),
    ('Qalamlar to''plami', '10 ta turli rangli qalam to''plami', 25000, '/placeholder.svg?height=400&width=300', qalamlar_id, globalmarket_id, 'pen', 'GlobalMarket', NULL, 120, 345, 4.6, TRUE, FALSE),
    
    -- Colored Pencils
    ('Faber-Castell 24 rang', 'Professional rangli qalamlar to''plami', 45000, '/placeholder.svg?height=400&width=300', rangli_qalamlar_id, globalmarket_id, 'pencil', 'Faber-Castell', NULL, 60, 234, 4.9, TRUE, TRUE),
    ('Crayola 12 rang', 'Bolalar uchun rangli qalamlar', 18000, '/placeholder.svg?height=400&width=300', rangli_qalamlar_id, globalmarket_id, 'pencil', 'Crayola', NULL, 100, 456, 4.5, TRUE, FALSE),
    ('Staedtler Noris', 'Maktab uchun oddiy qalam', 2500, '/placeholder.svg?height=400&width=300', rangli_qalamlar_id, globalmarket_id, 'pencil', 'Staedtler', NULL, 300, 678, 4.4, TRUE, FALSE),
    
    -- School Supplies
    ('Maktab sumkasi', 'Katta va qulay maktab sumkasi', 85000, '/placeholder.svg?height=400&width=300', maktab_id, globalmarket_id, 'bag', 'GlobalMarket', NULL, 45, 123, 4.7, TRUE, TRUE),
    ('Geometriya to''plami', 'Chizg''ich, burchak, sirkullar to''plami', 15000, '/placeholder.svg?height=400&width=300', maktab_id, globalmarket_id, 'geometry', 'GlobalMarket', NULL, 80, 234, 4.6, TRUE, FALSE),
    ('Kalkulyator', 'Ilmiy kalkulyator maktab uchun', 35000, '/placeholder.svg?height=400&width=300', maktab_id, globalmarket_id, 'calculator', 'Casio', NULL, 25, 167, 4.8, TRUE, TRUE),
    
    -- Office Supplies
    ('Fayl papka A4', 'Hujjatlar uchun plastik papka', 5000, '/placeholder.svg?height=400&width=300', ofis_id, globalmarket_id, 'folder', 'GlobalMarket', NULL, 150, 345, 4.3, TRUE, FALSE),
    ('Skrepkalar to''plami', '100 ta skrepka to''plami', 8000, '/placeholder.svg?height=400&width=300', ofis_id, globalmarket_id, 'clips', 'GlobalMarket', NULL, 200, 456, 4.2, TRUE, FALSE),
    ('Stiker yopishqoqlar', 'Turli rangli stiker to''plami', 12000, '/placeholder.svg?height=400&width=300', ofis_id, globalmarket_id, 'stickers', 'GlobalMarket', NULL, 100, 234, 4.5, TRUE, FALSE);

END $$;

-- Create indexes
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_products_type ON products(product_type);
CREATE INDEX idx_products_popular ON products(is_popular);
CREATE INDEX idx_products_featured ON products(is_featured);
CREATE INDEX idx_cart_user ON cart(user_id);
CREATE INDEX idx_orders_product ON orders(product_id);
CREATE INDEX idx_categories_slug ON categories(slug);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Users can insert their own products" ON products FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Users can update their own products" ON products FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Users can view their own cart" ON cart FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert into their own cart" ON cart FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cart" ON cart FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete from their own cart" ON cart FOR DELETE USING (auth.uid() = user_id);
