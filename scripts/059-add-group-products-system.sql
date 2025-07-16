-- Add product_type column if not exists and group_id column
DO $$ 
BEGIN
    -- Add product_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'product_type') THEN
        ALTER TABLE products ADD COLUMN product_type VARCHAR(20) DEFAULT 'single';
    END IF;
    
    -- Add group_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'group_id') THEN
        ALTER TABLE products ADD COLUMN group_id UUID;
    END IF;
    
    -- Add group_products table for storing individual products in a group
    CREATE TABLE IF NOT EXISTS group_products (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        group_id UUID NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        product_description TEXT,
        individual_price DECIMAL(10,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Add foreign key constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_group_products_group_id') THEN
        ALTER TABLE group_products ADD CONSTRAINT fk_group_products_group_id 
        FOREIGN KEY (group_id) REFERENCES products(id) ON DELETE CASCADE;
    END IF;
    
    -- Update existing products to be 'single' type
    UPDATE products SET product_type = 'single' WHERE product_type IS NULL;
    
    -- Add index for better performance
    CREATE INDEX IF NOT EXISTS idx_products_group_id ON products(group_id);
    CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);
    CREATE INDEX IF NOT EXISTS idx_group_products_group_id ON group_products(group_id);
    
END $$;

-- Create function to get group products
CREATE OR REPLACE FUNCTION get_group_products(group_product_id UUID)
RETURNS TABLE (
    id UUID,
    product_name VARCHAR(255),
    product_description TEXT,
    individual_price DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gp.id,
        gp.product_name,
        gp.product_description,
        gp.individual_price
    FROM group_products gp
    WHERE gp.group_id = group_product_id
    ORDER BY gp.created_at;
END;
$$ LANGUAGE plpgsql;

-- Create function to search products including group products
CREATE OR REPLACE FUNCTION search_products_with_groups(search_term TEXT DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    description TEXT,
    price DECIMAL(10,2),
    image_url TEXT,
    product_type VARCHAR(20),
    group_id UUID,
    category_id UUID,
    seller_id UUID,
    stock_quantity INTEGER,
    is_active BOOLEAN,
    is_approved BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    group_products_names TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.image_url,
        p.product_type,
        p.group_id,
        p.category_id,
        p.seller_id,
        p.stock_quantity,
        p.is_active,
        p.is_approved,
        p.created_at,
        CASE 
            WHEN p.product_type = 'group' THEN 
                (SELECT STRING_AGG(gp.product_name, ', ') 
                 FROM group_products gp 
                 WHERE gp.group_id = p.id)
            ELSE NULL
        END as group_products_names
    FROM products p
    WHERE 
        p.is_active = true 
        AND p.is_approved = true
        AND (
            search_term IS NULL 
            OR p.name ILIKE '%' || search_term || '%'
            OR p.description ILIKE '%' || search_term || '%'
            OR (p.product_type = 'group' AND EXISTS (
                SELECT 1 FROM group_products gp 
                WHERE gp.group_id = p.id 
                AND gp.product_name ILIKE '%' || search_term || '%'
            ))
        )
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Update create_simple_order function to handle group products
CREATE OR REPLACE FUNCTION create_simple_order(
    product_id_param UUID,
    full_name_param VARCHAR(255),
    phone_param VARCHAR(20),
    address_param TEXT,
    quantity_param INTEGER,
    user_id_param UUID DEFAULT NULL,
    selected_group_product_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    product_record RECORD;
    total_amount_calc DECIMAL(10,2);
    new_order_id UUID;
    selected_product_name VARCHAR(255);
BEGIN
    -- Get product details
    SELECT * INTO product_record 
    FROM products 
    WHERE id = product_id_param AND is_active = true AND is_approved = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Mahsulot topilmadi yoki faol emas');
    END IF;
    
    -- Check stock
    IF product_record.stock_quantity < quantity_param THEN
        RETURN json_build_object('success', false, 'error', 'Yetarli miqdor yo''q');
    END IF;
    
    -- For group products, get selected product name
    IF product_record.product_type = 'group' AND selected_group_product_id IS NOT NULL THEN
        SELECT product_name INTO selected_product_name
        FROM group_products 
        WHERE id = selected_group_product_id AND group_id = product_id_param;
        
        IF NOT FOUND THEN
            RETURN json_build_object('success', false, 'error', 'Tanlangan mahsulot topilmadi');
        END IF;
    END IF;
    
    -- Calculate total amount
    total_amount_calc := product_record.price * quantity_param;
    
    -- Create order
    INSERT INTO orders (
        product_id,
        user_id,
        full_name,
        phone,
        address,
        quantity,
        total_amount,
        status,
        selected_group_product_id,
        selected_product_name,
        created_at,
        updated_at
    ) VALUES (
        product_id_param,
        user_id_param,
        full_name_param,
        phone_param,
        address_param,
        quantity_param,
        total_amount_calc,
        'pending',
        selected_group_product_id,
        selected_product_name,
        NOW(),
        NOW()
    ) RETURNING id INTO new_order_id;
    
    -- Update product stock and order count
    UPDATE products 
    SET 
        stock_quantity = stock_quantity - quantity_param,
        order_count = COALESCE(order_count, 0) + quantity_param,
        updated_at = NOW()
    WHERE id = product_id_param;
    
    RETURN json_build_object(
        'success', true, 
        'order_id', new_order_id,
        'total_amount', total_amount_calc
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Add columns to orders table for group products
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'selected_group_product_id') THEN
        ALTER TABLE orders ADD COLUMN selected_group_product_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'selected_product_name') THEN
        ALTER TABLE orders ADD COLUMN selected_product_name VARCHAR(255);
    END IF;
END $$;
