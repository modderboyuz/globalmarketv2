-- Drop existing tables if they exist
DROP TABLE IF EXISTS cart CASCADE;
DROP TABLE IF EXISTS product_orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Create products table (replacing books table)
CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    category_id UUID REFERENCES categories(id),
    seller_id UUID REFERENCES users(id),
    product_type VARCHAR(50) NOT NULL DEFAULT 'other', -- book, pen, notebook, pencil, etc.
    brand VARCHAR(100),
    author VARCHAR(100), -- for books
    isbn VARCHAR(20), -- for books
    stock_quantity INTEGER DEFAULT 0,
    order_count INTEGER DEFAULT 0,
    is_popular BOOLEAN DEFAULT FALSE,
    has_delivery BOOLEAN DEFAULT FALSE, -- most products won't have delivery
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

-- Update orders table to work with products
ALTER TABLE orders DROP COLUMN IF EXISTS book_id;
ALTER TABLE orders ADD COLUMN product_id UUID REFERENCES products(id);
ALTER TABLE orders ADD COLUMN quantity INTEGER DEFAULT 1;
ALTER TABLE orders ADD COLUMN order_type VARCHAR(20) DEFAULT 'immediate'; -- immediate, cart

-- Update users table for seller verification
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified_seller BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS seller_documents TEXT; -- JSON field for documents
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending'; -- pending, approved, rejected
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin_full BOOLEAN DEFAULT FALSE; -- for full admin access

-- Insert sample products
INSERT INTO products (name, description, price, image_url, category_id, seller_id, product_type, brand, author, stock_quantity, is_popular, has_delivery) VALUES
-- Books
('O''tkan kunlar', 'Abdulla Qodiriyning mashhur romani', 25000, '/placeholder.svg?height=400&width=300', 
 (SELECT id FROM categories WHERE slug = 'adabiyot' LIMIT 1), 
 (SELECT id FROM users LIMIT 1), 
 'book', NULL, 'Abdulla Qodiriy', 50, TRUE, FALSE),

('Mehrobdan chayon', 'Abdulla Qahhorning hikoyalar to''plami', 18000, '/placeholder.svg?height=400&width=300',
 (SELECT id FROM categories WHERE slug = 'adabiyot' LIMIT 1),
 (SELECT id FROM users LIMIT 1),
 'book', NULL, 'Abdulla Qahhor', 30, TRUE, FALSE),

-- Pens
('Pilot G2 qalam', 'Yuqori sifatli gel qalam', 8000, '/placeholder.svg?height=400&width=300',
 (SELECT id FROM categories WHERE slug = 'maktab-buyumlari' LIMIT 1),
 (SELECT id FROM users LIMIT 1),
 'pen', 'Pilot', NULL, 100, TRUE, FALSE),

('BIC qalam to''plami', '10 ta rangli qalam to''plami', 15000, '/placeholder.svg?height=400&width=300',
 (SELECT id FROM categories WHERE slug = 'maktab-buyumlari' LIMIT 1),
 (SELECT id FROM users LIMIT 1),
 'pen', 'BIC', NULL, 75, TRUE, FALSE),

-- Notebooks
('A4 daftar', 'Chiziqli A4 daftar, 96 varaq', 12000, '/placeholder.svg?height=400&width=300',
 (SELECT id FROM categories WHERE slug = 'maktab-buyumlari' LIMIT 1),
 (SELECT id FROM users LIMIT 1),
 'notebook', 'Local', NULL, 200, TRUE, FALSE),

('Matematika daftari', 'Katak daftar matematika uchun', 10000, '/placeholder.svg?height=400&width=300',
 (SELECT id FROM categories WHERE slug = 'maktab-buyumlari' LIMIT 1),
 (SELECT id FROM users LIMIT 1),
 'notebook', 'Local', NULL, 150, TRUE, FALSE),

-- Pencils
('Faber-Castell qalam', 'HB qalam, yuqori sifat', 5000, '/placeholder.svg?height=400&width=300',
 (SELECT id FROM categories WHERE slug = 'maktab-buyumlari' LIMIT 1),
 (SELECT id FROM users LIMIT 1),
 'pencil', 'Faber-Castell', NULL, 300, TRUE, FALSE),

('Rangli qalamlar to''plami', '24 ta rangli qalam', 35000, '/placeholder.svg?height=400&width=300',
 (SELECT id FROM categories WHERE slug = 'maktab-buyumlari' LIMIT 1),
 (SELECT id FROM users LIMIT 1),
 'pencil', 'Faber-Castell', NULL, 80, TRUE, TRUE); -- This one has delivery

-- Create indexes for better performance
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_products_type ON products(product_type);
CREATE INDEX idx_products_popular ON products(is_popular);
CREATE INDEX idx_cart_user ON cart(user_id);
CREATE INDEX idx_orders_product ON orders(product_id);

-- Set main admin
UPDATE users SET is_admin_full = TRUE WHERE id = (SELECT id FROM users LIMIT 1);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Users can insert their own products" ON products FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Users can update their own products" ON products FOR UPDATE USING (auth.uid() = seller_id);

-- RLS Policies for cart
CREATE POLICY "Users can view their own cart" ON cart FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert into their own cart" ON cart FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cart" ON cart FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete from their own cart" ON cart FOR DELETE USING (auth.uid() = user_id);
