-- Create cart_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS on cart_items
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for cart_items
CREATE POLICY "Users can manage their own cart items" ON cart_items
  FOR ALL USING (user_id = auth.uid());

-- Add indexes for cart_items
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- Fix messages table foreign key for reply_to
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_reply_to_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_reply_to_fkey 
  FOREIGN KEY (reply_to) REFERENCES messages(id) ON DELETE SET NULL;

-- Fix cart table relationship with products
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_product_id_fkey;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- Add missing address column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;

-- Remove book_request columns from contact_messages
ALTER TABLE contact_messages DROP COLUMN IF EXISTS book_request_title;
ALTER TABLE contact_messages DROP COLUMN IF EXISTS book_request_author;

-- Add views, likes, and comments system for products
CREATE TABLE IF NOT EXISTS product_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, user_id, ip_address)
);

CREATE TABLE IF NOT EXISTS product_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

CREATE TABLE IF NOT EXISTS product_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES product_comments(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_product_likes_product_id ON product_likes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_comments_product_id ON product_comments(product_id);
CREATE INDEX IF NOT EXISTS idx_product_comments_parent_id ON product_comments(parent_id);

-- Update products table to include view and like counts
ALTER TABLE products ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- Create functions to update counts
CREATE OR REPLACE FUNCTION update_product_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products 
  SET view_count = (
    SELECT COUNT(*) FROM product_views WHERE product_id = NEW.product_id
  )
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_product_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products 
  SET like_count = (
    SELECT COUNT(*) FROM product_likes WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
  )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_product_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products 
  SET comment_count = (
    SELECT COUNT(*) FROM product_comments WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
  )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_product_view_count ON product_views;
CREATE TRIGGER trigger_update_product_view_count
  AFTER INSERT ON product_views
  FOR EACH ROW EXECUTE FUNCTION update_product_view_count();

DROP TRIGGER IF EXISTS trigger_update_product_like_count ON product_likes;
CREATE TRIGGER trigger_update_product_like_count
  AFTER INSERT OR DELETE ON product_likes
  FOR EACH ROW EXECUTE FUNCTION update_product_like_count();

DROP TRIGGER IF EXISTS trigger_update_product_comment_count ON product_comments;
CREATE TRIGGER trigger_update_product_comment_count
  AFTER INSERT OR DELETE ON product_comments
  FOR EACH ROW EXECUTE FUNCTION update_product_comment_count();

-- Fix RLS policies for messages
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (
    sender_id = auth.uid() OR 
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

-- Fix RLS policies for conversations
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
CREATE POLICY "Users can view their conversations" ON conversations
  FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid());

-- Enable RLS on new tables
ALTER TABLE product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for product interactions
CREATE POLICY "Anyone can view product views" ON product_views FOR SELECT USING (true);
CREATE POLICY "Users can create product views" ON product_views FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view product likes" ON product_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their likes" ON product_likes FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Anyone can view approved comments" ON product_comments FOR SELECT USING (is_approved = true);
CREATE POLICY "Users can create comments" ON product_comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their comments" ON product_comments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all comments" ON product_comments FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
);

-- Update existing products with current counts
UPDATE products SET 
  view_count = COALESCE((SELECT COUNT(*) FROM product_views WHERE product_id = products.id), 0),
  like_count = COALESCE((SELECT COUNT(*) FROM product_likes WHERE product_id = products.id), 0),
  comment_count = COALESCE((SELECT COUNT(*) FROM product_comments WHERE product_id = products.id), 0);
