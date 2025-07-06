-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_seller BOOLEAN DEFAULT FALSE,
  telegram_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_uz VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  slug VARCHAR(255) UNIQUE NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Books table
CREATE TABLE IF NOT EXISTS books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  category_id UUID REFERENCES categories(id),
  seller_id UUID REFERENCES users(id),
  stock_quantity INTEGER DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  book_id UUID REFERENCES books(id),
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  delivery_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, cancelled
  total_amount DECIMAL(10,2) NOT NULL,
  anon_temp_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact requests table
CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  book_title VARCHAR(500),
  request_type VARCHAR(50) DEFAULT 'general', -- general, book_request, sell_request
  status VARCHAR(50) DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample categories
INSERT INTO categories (name_uz, name_en, slug) VALUES
('Badiiy adabiyot', 'Fiction', 'fiction'),
('Ilmiy kitoblar', 'Science', 'science'),
('Bolalar kitoblari', 'Children Books', 'children'),
('Tarix', 'History', 'history'),
('Psixologiya', 'Psychology', 'psychology'),
('Biznes', 'Business', 'business');

-- Insert sample books
INSERT INTO books (title, author, description, price, category_id, stock_quantity, order_count, is_featured) 
SELECT 
  'O''tkan kunlar',
  'Abdulla Qodiriy',
  'O''zbek adabiyotining eng mashhur asarlaridan biri',
  45000,
  c.id,
  50,
  120,
  true
FROM categories c WHERE c.slug = 'fiction'
LIMIT 1;

INSERT INTO books (title, author, description, price, category_id, stock_quantity, order_count, is_featured) 
SELECT 
  'Mehrobdan chayon',
  'Abdulla Qodiriy',
  'Klassik o''zbek romani',
  38000,
  c.id,
  30,
  95,
  true
FROM categories c WHERE c.slug = 'fiction'
LIMIT 1;

INSERT INTO books (title, author, description, price, category_id, stock_quantity, order_count, is_featured) 
SELECT 
  'Xamsa',
  'Alisher Navoiy',
  'Buyuk shoir Navoiyning besh dostondan iborat asari',
  65000,
  c.id,
  25,
  80,
  true
FROM categories c WHERE c.slug = 'fiction'
LIMIT 1;
