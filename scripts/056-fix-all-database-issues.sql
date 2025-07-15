-- Drop existing problematic functions and recreate them properly
DROP FUNCTION IF EXISTS create_order CASCADE;
DROP FUNCTION IF EXISTS handle_like_toggle CASCADE;
DROP FUNCTION IF EXISTS increment_view_count CASCADE;

-- Fix increment_view_count function
CREATE OR REPLACE FUNCTION increment_view_count(product_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE products 
    SET view_count = COALESCE(view_count, 0) + 1,
        updated_at = NOW()
    WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create simple order creation function
CREATE OR REPLACE FUNCTION create_simple_order(
    product_id_param UUID,
    full_name_param TEXT,
    phone_param TEXT,
    address_param TEXT,
    quantity_param INTEGER,
    user_id_param UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    product_record RECORD;
    order_id UUID;
    total_amount DECIMAL(12,2);
BEGIN
    -- Get product details
    SELECT * INTO product_record 
    FROM products 
    WHERE id = product_id_param AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Mahsulot topilmadi');
    END IF;
    
    -- Check stock
    IF product_record.stock_quantity < quantity_param THEN
        RETURN json_build_object('success', false, 'error', 'Yetarli mahsulot yo''q');
    END IF;
    
    -- Calculate total
    total_amount := product_record.price * quantity_param;
    
    -- Create order
    INSERT INTO orders (
        user_id, product_id, full_name, phone, address, 
        quantity, total_amount, status
    ) VALUES (
        user_id_param, product_id_param, full_name_param, 
        phone_param, address_param, quantity_param, 
        total_amount, 'pending'
    ) RETURNING id INTO order_id;
    
    -- Update product stock and order count
    UPDATE products 
    SET stock_quantity = stock_quantity - quantity_param,
        order_count = COALESCE(order_count, 0) + 1,
        updated_at = NOW()
    WHERE id = product_id_param;
    
    RETURN json_build_object(
        'success', true,
        'order_id', order_id,
        'total_amount', total_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix seller_applications table to avoid relationship conflicts
DROP TABLE IF EXISTS seller_applications CASCADE;
CREATE TABLE seller_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_type TEXT,
    business_address TEXT,
    business_phone TEXT,
    business_description TEXT,
    documents TEXT[],
    status TEXT DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a unified applications view
CREATE OR REPLACE VIEW all_applications AS
SELECT 
    id,
    'seller' as type,
    status,
    created_at,
    updated_at,
    reviewed_at,
    admin_notes,
    null as admin_response,
    user_id,
    business_name as company_name,
    business_type,
    null as experience,
    business_description as description,
    null as product_data,
    null as name,
    null as email,
    null as phone,
    null as subject,
    null as message,
    null as full_name,
    null as message_type,
    null as book_request_title,
    null as book_request_author
FROM seller_applications

UNION ALL

SELECT 
    id,
    'contact' as type,
    status,
    created_at,
    updated_at,
    null as reviewed_at,
    null as admin_notes,
    admin_response,
    user_id,
    null as company_name,
    null as business_type,
    null as experience,
    null as description,
    null as product_data,
    name,
    email,
    phone,
    subject,
    message,
    full_name,
    message_type,
    book_request_title,
    book_request_author
FROM contact_messages;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT SELECT ON all_applications TO authenticated;
