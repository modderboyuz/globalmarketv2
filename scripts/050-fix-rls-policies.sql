-- Fix RLS policies to avoid infinite recursion

-- Disable RLS temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhoods DISABLE ROW LEVEL SECURITY;
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE seller_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE complaints DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Public users read access" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Admins full access" ON users;
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Sellers can manage own products" ON products;
DROP POLICY IF EXISTS "Users can view related orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can update related orders" ON orders;
DROP POLICY IF EXISTS "Users can manage own cart" ON cart_items;
DROP POLICY IF EXISTS "Anyone can view likes" ON likes;
DROP POLICY IF EXISTS "Users can manage own likes" ON likes;
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
DROP POLICY IF EXISTS "Anyone can view neighborhoods" ON neighborhoods;
DROP POLICY IF EXISTS "Admins can manage neighborhoods" ON neighborhoods;
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can view own applications" ON seller_applications;
DROP POLICY IF EXISTS "Users can create applications" ON seller_applications;
DROP POLICY IF EXISTS "Admins can update applications" ON seller_applications;
DROP POLICY IF EXISTS "Anyone can create contact messages" ON contact_messages;
DROP POLICY IF EXISTS "Admins can view contact messages" ON contact_messages;
DROP POLICY IF EXISTS "Users can view own complaints" ON complaints;
DROP POLICY IF EXISTS "Users can create complaints" ON complaints;

-- Create helper function to check if user is admin (to avoid recursion)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- Simple policies without recursion

-- Users policies
CREATE POLICY "users_select_policy" ON users FOR SELECT USING (
    id = auth.uid() OR is_admin(auth.uid()) OR (is_verified_seller = true AND is_active = true)
);

CREATE POLICY "users_insert_policy" ON users FOR INSERT WITH CHECK (
    id = auth.uid() AND is_admin = false AND is_verified_seller = false AND is_seller = false
);

CREATE POLICY "users_update_policy" ON users FOR UPDATE USING (
    id = auth.uid() OR is_admin(auth.uid())
) WITH CHECK (
    (id = auth.uid() AND is_admin = is_admin AND is_verified_seller = is_verified_seller AND is_seller = is_seller) OR
    is_admin(auth.uid())
);

-- Products policies
CREATE POLICY "products_select_policy" ON products FOR SELECT USING (true);

CREATE POLICY "products_insert_policy" ON products FOR INSERT WITH CHECK (
    seller_id = auth.uid() OR is_admin(auth.uid())
);

CREATE POLICY "products_update_policy" ON products FOR UPDATE USING (
    seller_id = auth.uid() OR is_admin(auth.uid())
);

CREATE POLICY "products_delete_policy" ON products FOR DELETE USING (
    seller_id = auth.uid() OR is_admin(auth.uid())
);

-- Orders policies
CREATE POLICY "orders_select_policy" ON orders FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM products WHERE products.id = orders.product_id AND products.seller_id = auth.uid()) OR
    is_admin(auth.uid())
);

CREATE POLICY "orders_insert_policy" ON orders FOR INSERT WITH CHECK (
    user_id = auth.uid() OR user_id IS NULL OR is_admin(auth.uid())
);

CREATE POLICY "orders_update_policy" ON orders FOR UPDATE USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM products WHERE products.id = orders.product_id AND products.seller_id = auth.uid()) OR
    is_admin(auth.uid())
);

-- Cart items policies
CREATE POLICY "cart_items_policy" ON cart_items FOR ALL USING (
    user_id = auth.uid()
);

-- Likes policies
CREATE POLICY "likes_select_policy" ON likes FOR SELECT USING (true);
CREATE POLICY "likes_insert_policy" ON likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "likes_update_policy" ON likes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "likes_delete_policy" ON likes FOR DELETE USING (user_id = auth.uid());

-- Categories policies
CREATE POLICY "categories_select_policy" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_modify_policy" ON categories FOR ALL USING (is_admin(auth.uid()));

-- Neighborhoods policies
CREATE POLICY "neighborhoods_select_policy" ON neighborhoods FOR SELECT USING (true);
CREATE POLICY "neighborhoods_modify_policy" ON neighborhoods FOR ALL USING (is_admin(auth.uid()));

-- Reviews policies
CREATE POLICY "reviews_select_policy" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_policy" ON reviews FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "reviews_update_policy" ON reviews FOR UPDATE USING (user_id = auth.uid());

-- Applications policies
CREATE POLICY "applications_select_policy" ON seller_applications FOR SELECT USING (
    user_id = auth.uid() OR is_admin(auth.uid())
);
CREATE POLICY "applications_insert_policy" ON seller_applications FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "applications_update_policy" ON seller_applications FOR UPDATE USING (is_admin(auth.uid()));

-- Contact messages policies
CREATE POLICY "contact_messages_insert_policy" ON contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "contact_messages_select_policy" ON contact_messages FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "contact_messages_update_policy" ON contact_messages FOR UPDATE USING (is_admin(auth.uid()));

-- Complaints policies
CREATE POLICY "complaints_select_policy" ON complaints FOR SELECT USING (
    user_id = auth.uid() OR is_admin(auth.uid())
);
CREATE POLICY "complaints_insert_policy" ON complaints FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "complaints_update_policy" ON complaints FOR UPDATE USING (is_admin(auth.uid()));

-- Fix user update policy to handle OLD reference properly
DROP POLICY IF EXISTS "users_update_policy" ON users;
CREATE POLICY "users_update_policy" ON users FOR UPDATE USING (
    id = auth.uid() OR is_admin(auth.uid())
) WITH CHECK (
    id = auth.uid() OR is_admin(auth.uid())
);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT SELECT ON categories, products, neighborhoods, reviews, likes TO anon;
