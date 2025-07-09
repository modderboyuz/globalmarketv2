-- Fix database permissions and RLS policies

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sell_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public can view categories" ON categories;
DROP POLICY IF EXISTS "Public can view products" ON products;
DROP POLICY IF EXISTS "Public can view ads" ON ads;
DROP POLICY IF EXISTS "Users can view their profile" ON users;
DROP POLICY IF EXISTS "Users can update their profile" ON users;
DROP POLICY IF EXISTS "Users can insert their profile" ON users;

-- Categories policies (public read)
CREATE POLICY "Public can view categories" ON categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON categories
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Products policies (public read, seller write)
CREATE POLICY "Public can view approved products" ON products
    FOR SELECT USING (is_active = true AND is_approved = true);

CREATE POLICY "Sellers can view their own products" ON products
    FOR SELECT USING (seller_id = auth.uid());

CREATE POLICY "Sellers can insert their own products" ON products
    FOR INSERT WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can update their own products" ON products
    FOR UPDATE USING (seller_id = auth.uid());

CREATE POLICY "Admins can manage all products" ON products
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Public can view seller profiles" ON users
    FOR SELECT USING (is_verified_seller = true);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Orders policies
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create orders" ON orders
    FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Sellers can view orders for their products" ON orders
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM products WHERE products.id = orders.product_id AND products.seller_id = auth.uid())
    );

CREATE POLICY "Admins can view all orders" ON orders
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Conversations policies
CREATE POLICY "Users can view their own conversations" ON conversations
    FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "Users can update their own conversations" ON conversations
    FOR UPDATE USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
        )
    );

CREATE POLICY "Users can send messages in their conversations" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
        )
    );

-- Admin messages policies
CREATE POLICY "Admins can view all admin messages" ON admin_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

CREATE POLICY "Anyone can create admin messages" ON admin_messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update admin messages" ON admin_messages
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Favorites policies
CREATE POLICY "Users can manage their own favorites" ON favorites
    FOR ALL USING (user_id = auth.uid());

-- Product likes policies
CREATE POLICY "Users can manage their own likes" ON product_likes
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Public can view likes" ON product_likes
    FOR SELECT USING (true);

-- Seller applications policies
CREATE POLICY "Users can view their own applications" ON seller_applications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create applications" ON seller_applications
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all applications" ON seller_applications
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

CREATE POLICY "Admins can update applications" ON seller_applications
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Ads policies
CREATE POLICY "Public can view active ads" ON ads
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage ads" ON ads
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Contact messages policies
CREATE POLICY "Anyone can create contact messages" ON contact_messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all contact messages" ON contact_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

CREATE POLICY "Admins can update contact messages" ON contact_messages
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Sell requests policies
CREATE POLICY "Users can view their own sell requests" ON sell_requests
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create sell requests" ON sell_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all sell requests" ON sell_requests
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

CREATE POLICY "Admins can update sell requests" ON sell_requests
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Order notifications policies
CREATE POLICY "Sellers can view their order notifications" ON order_notifications
    FOR SELECT USING (seller_id = auth.uid());

CREATE POLICY "Buyers can view their order notifications" ON order_notifications
    FOR SELECT USING (buyer_id = auth.uid());

CREATE POLICY "System can create order notifications" ON order_notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Sellers can update their order notifications" ON order_notifications
    FOR UPDATE USING (seller_id = auth.uid());

-- Broadcast messages policies
CREATE POLICY "Admins can manage broadcast messages" ON broadcast_messages
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, username)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'full_name', 'user'), ' ', '_')) || '_' || SUBSTRING(NEW.id::text, 1, 8)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update existing products to be approved
UPDATE products SET is_approved = true WHERE is_approved = false;

-- Make sure admin user exists and has proper permissions
INSERT INTO users (
    id,
    email, 
    full_name, 
    username,
    phone, 
    is_admin, 
    is_verified_seller,
    telegram_id
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin@globalmarket.uz',
    'GlobalMarket Admin',
    'admin',
    '+998958657500',
    true,
    true,
    123456789
) ON CONFLICT (email) DO UPDATE SET
    is_admin = true,
    is_verified_seller = true,
    phone = EXCLUDED.phone,
    telegram_id = EXCLUDED.telegram_id;

-- Grant execute permissions on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
