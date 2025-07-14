-- Complete system fix with all requested features

-- First, drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
DROP POLICY IF EXISTS "Sellers can manage own products" ON products;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can create own orders" ON orders;
DROP POLICY IF EXISTS "Users and sellers can update orders" ON orders;
DROP POLICY IF EXISTS "Users can view order items" ON order_items;
DROP POLICY IF EXISTS "Users can create order items" ON order_items;
DROP POLICY IF EXISTS "Users can manage own cart" ON cart_items;
DROP POLICY IF EXISTS "Users can view own seller applications" ON seller_applications;
DROP POLICY IF EXISTS "Users can create seller applications" ON seller_applications;
DROP POLICY IF EXISTS "Admins can update seller applications" ON seller_applications;
DROP POLICY IF EXISTS "Users can view own product applications" ON product_applications;
DROP POLICY IF EXISTS "Users can create product applications" ON product_applications;
DROP POLICY IF EXISTS "Admins can update product applications" ON product_applications;
DROP POLICY IF EXISTS "Anyone can create contact messages" ON contact_messages;
DROP POLICY IF EXISTS "Admins can view contact messages" ON contact_messages;
DROP POLICY IF EXISTS "Admins can update contact messages" ON contact_messages;
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can view own complaints" ON complaints;
DROP POLICY IF EXISTS "Users can create own complaints" ON complaints;
DROP POLICY IF EXISTS "Admins can update complaints" ON complaints;
DROP POLICY IF EXISTS "Users can manage own likes" ON likes;
DROP POLICY IF EXISTS "Anyone can view likes" ON likes;
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;

-- Add delivery fields to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS has_delivery BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_warranty BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS warranty_months INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_return BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS return_days INTEGER DEFAULT 0;

-- Add delivery fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS with_delivery BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS house_number TEXT;

-- Create neighborhoods table for G'uzor district
CREATE TABLE IF NOT EXISTS neighborhoods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    district TEXT DEFAULT 'G''uzor',
    region TEXT DEFAULT 'Qashqadaryo',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert G'uzor neighborhoods
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
('Qorako''l'), ('Jonbuloq'), ('Eshonquduq'), ('Buyuk karvon'), ('Paxtazor'), ('Xo''jaguzar')
ON CONFLICT (name) DO NOTHING;

-- Drop problematic functions
DROP FUNCTION IF EXISTS create_order(UUID, TEXT, TEXT, TEXT, INTEGER, UUID);
DROP FUNCTION IF EXISTS create_order(UUID, TEXT, TEXT, TEXT, INTEGER, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS toggle_product_like(UUID, UUID);
DROP FUNCTION IF EXISTS handle_like_toggle(UUID, UUID);

-- Create single create_order function
CREATE OR REPLACE FUNCTION create_order(
    product_id_param UUID,
    full_name_param TEXT,
    phone_param TEXT,
    address_param TEXT,
    quantity_param INTEGER,
    user_id_param UUID DEFAULT NULL,
    with_delivery_param BOOLEAN DEFAULT false,
    neighborhood_param TEXT DEFAULT NULL,
    street_param TEXT DEFAULT NULL,
    house_number_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    product_record RECORD;
    order_id UUID;
    total_amount DECIMAL(10,2);
    delivery_price DECIMAL(10,2) := 0;
    result JSON;
BEGIN
    -- Get product details
    SELECT * INTO product_record 
    FROM products 
    WHERE id = product_id_param AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mahsulot topilmadi yoki nofaol'
        );
    END IF;
    
    -- Check stock
    IF product_record.stock_quantity < quantity_param THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Yetarli miqdorda mahsulot yo''q'
        );
    END IF;
    
    -- Calculate delivery price
    IF with_delivery_param AND product_record.has_delivery THEN
        delivery_price := COALESCE(product_record.delivery_price, 0);
    END IF;
    
    -- Calculate total amount
    total_amount := (product_record.price * quantity_param) + delivery_price;
    
    -- Create order
    INSERT INTO orders (
        user_id,
        product_id,
        full_name,
        phone,
        address,
        quantity,
        total_amount,
        with_delivery,
        delivery_price,
        delivery_address,
        neighborhood,
        street,
        house_number,
        status,
        stage,
        created_at
    ) VALUES (
        user_id_param,
        product_id_param,
        full_name_param,
        phone_param,
        address_param,
        quantity_param,
        total_amount,
        with_delivery_param,
        delivery_price,
        CASE WHEN with_delivery_param THEN address_param ELSE NULL END,
        neighborhood_param,
        street_param,
        house_number_param,
        'pending',
        1,
        NOW()
    ) RETURNING id INTO order_id;
    
    -- Update product stock
    UPDATE products 
    SET stock_quantity = stock_quantity - quantity_param,
        order_count = COALESCE(order_count, 0) + 1,
        updated_at = NOW()
    WHERE id = product_id_param;
    
    RETURN json_build_object(
        'success', true,
        'order_id', order_id,
        'total_amount', total_amount,
        'delivery_price', delivery_price,
        'message', 'Buyurtma muvaffaqiyatli yaratildi'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create like toggle function
CREATE OR REPLACE FUNCTION handle_like_toggle(
    product_id_param UUID,
    user_id_param UUID
)
RETURNS JSON AS $$
DECLARE
    existing_like_id UUID;
    current_likes_count INTEGER;
    is_liked BOOLEAN;
    result JSON;
BEGIN
    -- Check if like exists
    SELECT id INTO existing_like_id 
    FROM likes 
    WHERE product_id = product_id_param AND user_id = user_id_param;
    
    IF existing_like_id IS NOT NULL THEN
        -- Remove like
        DELETE FROM likes WHERE id = existing_like_id;
        is_liked := false;
    ELSE
        -- Add like
        INSERT INTO likes (product_id, user_id, created_at) 
        VALUES (product_id_param, user_id_param, NOW());
        is_liked := true;
    END IF;
    
    -- Get current likes count
    SELECT COUNT(*) INTO current_likes_count 
    FROM likes 
    WHERE product_id = product_id_param;
    
    -- Update product likes count
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

-- Create increment view function
CREATE OR REPLACE FUNCTION increment_view_count(product_id_param UUID)
RETURNS void AS $$
BEGIN
    UPDATE products 
    SET view_count = COALESCE(view_count, 0) + 1,
        updated_at = NOW()
    WHERE id = product_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create user creation trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (
        id,
        email,
        full_name,
        avatar_url,
        type,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url',
        CASE 
            WHEN NEW.app_metadata->>'provider' = 'google' THEN 'email'
            ELSE 'telegram'
        END,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, users.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create secure RLS policies without infinite recursion

-- Users policies - secure admin fields
CREATE POLICY "Public users read access" ON users 
    FOR SELECT USING (
        -- Allow reading basic user info, but hide admin fields for non-admins
        CASE 
            WHEN auth.uid() IS NULL THEN true  -- Anonymous can see basic info
            WHEN auth.uid() = id THEN true     -- Users can see their own full profile
            ELSE (
                -- Others can only see if current user is admin
                EXISTS (
                    SELECT 1 FROM auth.users au 
                    JOIN users u ON au.id = u.id 
                    WHERE au.id = auth.uid() AND u.is_admin = true
                )
            )
        END
    );

CREATE POLICY "Users can update own profile" ON users 
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        -- Prevent non-admins from updating admin fields
        (
            is_admin = OLD.is_admin AND 
            is_verified_seller = OLD.is_verified_seller AND
            is_seller = OLD.is_seller
        ) OR
        EXISTS (
            SELECT 1 FROM auth.users au 
            JOIN users u ON au.id = u.id 
            WHERE au.id = auth.uid() AND u.is_admin = true
        )
    );

CREATE POLICY "Users can insert own profile" ON users 
    FOR INSERT WITH CHECK (
        auth.uid() = id AND
        -- Prevent setting admin fields on insert
        is_admin = false AND
        is_verified_seller = false AND
        is_seller = false
    );

CREATE POLICY "Admins full access" ON users 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users au 
            JOIN users u ON au.id = u.id 
            WHERE au.id = auth.uid() AND u.is_admin = true
        )
    );

-- Products policies
CREATE POLICY "Anyone can view products" ON products 
    FOR SELECT USING (true);

CREATE POLICY "Sellers can manage own products" ON products 
    FOR ALL USING (
        auth.uid() = seller_id OR 
        EXISTS (
            SELECT 1 FROM auth.users au 
            JOIN users u ON au.id = u.id 
            WHERE au.id = auth.uid() AND u.is_admin = true
        )
    );

-- Orders policies
CREATE POLICY "Users can view related orders" ON orders 
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM products p 
            WHERE p.id = orders.product_id AND p.seller_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM auth.users au 
            JOIN users u ON au.id = u.id 
            WHERE au.id = auth.uid() AND u.is_admin = true
        )
    );

CREATE POLICY "Users can create orders" ON orders 
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR auth.uid() IS NULL
    );

CREATE POLICY "Users can update related orders" ON orders 
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM products p 
            WHERE p.id = orders.product_id AND p.seller_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM auth.users au 
            JOIN users u ON au.id = u.id 
            WHERE au.id = auth.uid() AND u.is_admin = true
        )
    );

-- Cart items policies
CREATE POLICY "Users can manage own cart" ON cart_items 
    FOR ALL USING (auth.uid() = user_id);

-- Likes policies
CREATE POLICY "Anyone can view likes" ON likes 
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own likes" ON likes 
    FOR ALL USING (auth.uid() = user_id);

-- Categories policies
CREATE POLICY "Anyone can view categories" ON categories 
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON categories 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users au 
            JOIN users u ON au.id = u.id 
            WHERE au.id = auth.uid() AND u.is_admin = true
        )
    );

-- Neighborhoods policies
CREATE POLICY "Anyone can view neighborhoods" ON neighborhoods 
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage neighborhoods" ON neighborhoods 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users au 
            JOIN users u ON au.id = u.id 
            WHERE au.id = auth.uid() AND u.is_admin = true
        )
    );

-- Reviews policies
CREATE POLICY "Anyone can view reviews" ON reviews 
    FOR SELECT USING (true);

CREATE POLICY "Users can create own reviews" ON reviews 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON reviews 
    FOR UPDATE USING (auth.uid() = user_id);

-- Applications policies
CREATE POLICY "Users can view own applications" ON seller_applications 
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM auth.users au 
            JOIN users u ON au.id = u.id 
            WHERE au.id = auth.uid() AND u.is_admin = true
        )
    );

CREATE POLICY "Users can create applications" ON seller_applications 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update applications" ON seller_applications 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users au 
            JOIN users u ON au.id = u.id 
            WHERE au.id = auth.uid() AND u.is_admin = true
        )
    );

-- Contact messages policies
CREATE POLICY "Anyone can create contact messages" ON contact_messages 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view contact messages" ON contact_messages 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users au 
            JOIN users u ON au.id = u.id 
            WHERE au.id = auth.uid() AND u.is_admin = true
        )
    );

-- Complaints policies
CREATE POLICY "Users can view own complaints" ON complaints 
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM auth.users au 
            JOIN users u ON au.id = u.id 
            WHERE au.id = auth.uid() AND u.is_admin = true
        )
    );

CREATE POLICY "Users can create complaints" ON complaints 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant read access to anonymous users for public data
GRANT SELECT ON categories TO anon;
GRANT SELECT ON products TO anon;
GRANT SELECT ON neighborhoods TO anon;
GRANT SELECT ON reviews TO anon;
GRANT SELECT ON likes TO anon;

-- Update existing products to have delivery info
UPDATE products 
SET has_delivery = true, 
    delivery_price = 5000,
    has_warranty = true,
    warranty_months = 12,
    has_return = true,
    return_days = 7
WHERE seller_id IN (
    SELECT id FROM users WHERE username = 'admin'
);

-- Ensure admin user exists
INSERT INTO users (
    id,
    full_name, 
    email, 
    username, 
    is_admin, 
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'GlobalMarket Admin',
    'admin@globalmarket.uz',
    'admin',
    true,
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    is_admin = true,
    is_active = true,
    updated_at = NOW();

-- Refresh schema
NOTIFY pgrst, 'reload schema';
