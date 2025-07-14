-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create neighborhoods table first
CREATE TABLE IF NOT EXISTS neighborhoods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert G'uzor district neighborhoods
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

-- Add delivery fields to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS has_delivery BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_warranty BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS warranty_period TEXT,
ADD COLUMN IF NOT EXISTS has_return BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS return_period TEXT;

-- Update orders table for delivery
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS with_delivery BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS house_number TEXT;

-- Fix user creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (
        id,
        email,
        full_name,
        phone,
        address,
        username,
        type,
        is_admin,
        is_seller,
        is_verified_seller,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'address', ''),
        COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
        'google',
        false,
        false,
        false,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = CASE 
            WHEN users.full_name = '' OR users.full_name IS NULL 
            THEN EXCLUDED.full_name 
            ELSE users.full_name 
        END,
        phone = CASE 
            WHEN users.phone = '' OR users.phone IS NULL 
            THEN EXCLUDED.phone 
            ELSE users.phone 
        END,
        address = CASE 
            WHEN users.address = '' OR users.address IS NULL 
            THEN EXCLUDED.address 
            ELSE users.address 
        END,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fix create_order function to handle delivery
DROP FUNCTION IF EXISTS create_order(UUID, TEXT, TEXT, TEXT, INTEGER, UUID);
DROP FUNCTION IF EXISTS create_order(UUID, TEXT, TEXT, TEXT, INTEGER, UUID, BOOLEAN);

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
) RETURNS JSON AS $$
DECLARE
    product_record RECORD;
    order_id UUID;
    total_price DECIMAL(10,2);
    delivery_price DECIMAL(10,2) := 0;
BEGIN
    -- Get product details
    SELECT * INTO product_record FROM products WHERE id = product_id_param AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Mahsulot topilmadi');
    END IF;
    
    -- Check stock
    IF product_record.stock < quantity_param THEN
        RETURN json_build_object('success', false, 'error', 'Yetarli mahsulot mavjud emas');
    END IF;
    
    -- Calculate delivery price
    IF with_delivery_param AND product_record.has_delivery THEN
        delivery_price := product_record.delivery_price;
    END IF;
    
    -- Calculate total price
    total_price := (product_record.price * quantity_param) + delivery_price;
    
    -- Create order
    INSERT INTO orders (
        product_id,
        user_id,
        full_name,
        phone,
        address,
        quantity,
        total_price,
        with_delivery,
        delivery_price,
        neighborhood,
        street,
        house_number,
        status,
        created_at
    ) VALUES (
        product_id_param,
        user_id_param,
        full_name_param,
        phone_param,
        address_param,
        quantity_param,
        total_price,
        with_delivery_param,
        delivery_price,
        neighborhood_param,
        street_param,
        house_number_param,
        'pending',
        NOW()
    ) RETURNING id INTO order_id;
    
    -- Update product stock
    UPDATE products 
    SET stock = stock - quantity_param,
        updated_at = NOW()
    WHERE id = product_id_param;
    
    RETURN json_build_object(
        'success', true, 
        'order_id', order_id,
        'total_price', total_price,
        'delivery_price', delivery_price
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_order TO authenticated, anon;
GRANT EXECUTE ON FUNCTION handle_new_user TO authenticated;
