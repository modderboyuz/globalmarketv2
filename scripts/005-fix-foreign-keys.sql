-- Fix foreign key constraints and add missing tables

-- First, let's make sure the users table exists and has proper structure
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_seller BOOLEAN DEFAULT FALSE,
  telegram_id BIGINT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contact_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  book_title TEXT,
  request_type TEXT DEFAULT 'general' CHECK (request_type IN ('general', 'book_request', 'sell_request')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update books table to handle seller_id properly
ALTER TABLE books 
DROP CONSTRAINT IF EXISTS books_seller_id_fkey;

ALTER TABLE books 
ADD CONSTRAINT books_seller_id_fkey 
FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL;

-- Make seller_id nullable in books table
ALTER TABLE books ALTER COLUMN seller_id DROP NOT NULL;

-- Update orders table to handle user_id properly  
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

ALTER TABLE orders 
ADD CONSTRAINT orders_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Make user_id nullable in orders table
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

-- Create RLS policies for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for contact_requests table
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests" ON contact_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create requests" ON contact_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all requests" ON contact_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- Create function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
