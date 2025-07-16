-- Add workflow columns to orders table if they don't exist
DO $$ 
BEGIN
    -- Add stage column (0=cancelled, 1=pending, 2=confirmed, 3=client_went, 4=completed)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'stage') THEN
        ALTER TABLE orders ADD COLUMN stage INTEGER DEFAULT 1;
    END IF;
    
    -- Add agreement status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'is_agree') THEN
        ALTER TABLE orders ADD COLUMN is_agree BOOLEAN DEFAULT NULL;
    END IF;
    
    -- Add client went status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'is_client_went') THEN
        ALTER TABLE orders ADD COLUMN is_client_went BOOLEAN DEFAULT NULL;
    END IF;
    
    -- Add client claimed status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'is_client_claimed') THEN
        ALTER TABLE orders ADD COLUMN is_client_claimed BOOLEAN DEFAULT NULL;
    END IF;
    
    -- Add pickup address
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'pickup_address') THEN
        ALTER TABLE orders ADD COLUMN pickup_address TEXT;
    END IF;
    
    -- Add seller notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'seller_notes') THEN
        ALTER TABLE orders ADD COLUMN seller_notes TEXT;
    END IF;
    
    -- Add client notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'client_notes') THEN
        ALTER TABLE orders ADD COLUMN client_notes TEXT;
    END IF;
    
    -- Add order type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'order_type') THEN
        ALTER TABLE orders ADD COLUMN order_type VARCHAR(20) DEFAULT 'web';
    END IF;
    
    -- Add anonymous temp id for telegram orders
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'anon_temp_id') THEN
        ALTER TABLE orders ADD COLUMN anon_temp_id VARCHAR(100);
    END IF;
END $$;

-- Update existing orders to have proper stage
UPDATE orders SET stage = 1 WHERE stage IS NULL;

-- Create or replace the order status update function
CREATE OR REPLACE FUNCTION update_order_status(
    order_id_param UUID,
    action_param TEXT,
    notes_param TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    order_record RECORD;
    result JSON;
BEGIN
    -- Get the current order
    SELECT * INTO order_record FROM orders WHERE id = order_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Buyurtma topilmadi');
    END IF;
    
    -- Handle different actions
    CASE action_param
        WHEN 'agree' THEN
            -- Admin agrees to the order
            UPDATE orders 
            SET 
                is_agree = true,
                stage = 2,
                seller_notes = COALESCE(notes_param, seller_notes),
                pickup_address = COALESCE(notes_param, address),
                updated_at = NOW()
            WHERE id = order_id_param;
            
            result := json_build_object('success', true, 'message', 'Buyurtma tasdiqlandi');
            
        WHEN 'reject' THEN
            -- Admin rejects the order
            UPDATE orders 
            SET 
                is_agree = false,
                stage = 0,
                status = 'cancelled',
                seller_notes = COALESCE(notes_param, seller_notes),
                updated_at = NOW()
            WHERE id = order_id_param;
            
            result := json_build_object('success', true, 'message', 'Buyurtma rad etildi');
            
        WHEN 'client_went' THEN
            -- Client confirms they went to pickup
            UPDATE orders 
            SET 
                is_client_went = true,
                stage = 3,
                client_notes = COALESCE(notes_param, client_notes),
                updated_at = NOW()
            WHERE id = order_id_param;
            
            result := json_build_object('success', true, 'message', 'Mijoz borgan deb belgilandi');
            
        WHEN 'client_not_went' THEN
            -- Client confirms they didn't go to pickup
            UPDATE orders 
            SET 
                is_client_went = false,
                client_notes = COALESCE(notes_param, client_notes),
                updated_at = NOW()
            WHERE id = order_id_param;
            
            result := json_build_object('success', true, 'message', 'Mijoz bormagan deb belgilandi');
            
        WHEN 'product_given' THEN
            -- Admin confirms product was given
            UPDATE orders 
            SET 
                is_client_claimed = true,
                stage = 4,
                status = 'completed',
                seller_notes = COALESCE(notes_param, seller_notes),
                updated_at = NOW()
            WHERE id = order_id_param;
            
            result := json_build_object('success', true, 'message', 'Mahsulot berilgan deb belgilandi');
            
        WHEN 'product_not_given' THEN
            -- Admin confirms product was not given
            UPDATE orders 
            SET 
                is_client_claimed = false,
                status = 'stopped',
                seller_notes = COALESCE(notes_param, seller_notes),
                updated_at = NOW()
            WHERE id = order_id_param;
            
            result := json_build_object('success', true, 'message', 'Buyurtma to\'xtatildi');
            
        ELSE
            result := json_build_object('success', false, 'error', 'Noto\'g\'ri action');
    END CASE;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update the create_simple_order function to handle group products
CREATE OR REPLACE FUNCTION create_simple_order(
    product_id_param UUID,
    full_name_param TEXT,
    phone_param TEXT,
    address_param TEXT,
    quantity_param INTEGER,
    user_id_param UUID DEFAULT NULL,
    selected_group_product_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    product_record RECORD;
    group_product_record RECORD;
    order_id UUID;
    total_amount DECIMAL;
    product_price DECIMAL;
BEGIN
    -- Get product details
    SELECT * INTO product_record FROM products WHERE id = product_id_param AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Mahsulot topilmadi yoki faol emas');
    END IF;
    
    -- Check stock
    IF product_record.stock_quantity < quantity_param THEN
        RETURN json_build_object('success', false, 'error', 'Yetarli mahsulot yo\'q');
    END IF;
    
    -- Determine the price to use
    product_price := product_record.price;
    
    -- If it's a group product and a specific product is selected
    IF product_record.product_type = 'group' AND selected_group_product_id IS NOT NULL THEN
        SELECT * INTO group_product_record 
        FROM group_products 
        WHERE id = selected_group_product_id AND group_id = product_id_param;
        
        IF FOUND AND group_product_record.individual_price IS NOT NULL THEN
            product_price := group_product_record.individual_price;
        END IF;
    END IF;
    
    -- Calculate total amount
    total_amount := product_price * quantity_param;
    
    -- Add delivery cost if applicable
    IF product_record.has_delivery AND address_param != 'Do''kondan olib ketish' THEN
        total_amount := total_amount + COALESCE(product_record.delivery_price, 0);
    END IF;
    
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
        stage,
        selected_group_product_id,
        order_type,
        created_at,
        updated_at
    ) VALUES (
        product_id_param,
        user_id_param,
        full_name_param,
        phone_param,
        address_param,
        quantity_param,
        total_amount,
        'pending',
        1, -- Stage 1: waiting for admin approval
        selected_group_product_id,
        'web',
        NOW(),
        NOW()
    ) RETURNING id INTO order_id;
    
    -- Update product stock and order count
    UPDATE products 
    SET 
        stock_quantity = stock_quantity - quantity_param,
        order_count = COALESCE(order_count, 0) + quantity_param,
        updated_at = NOW()
    WHERE id = product_id_param;
    
    RETURN json_build_object(
        'success', true, 
        'order_id', order_id,
        'total_amount', total_amount,
        'message', 'Buyurtma muvaffaqiyatli yaratildi'
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_order_status TO authenticated;
GRANT EXECUTE ON FUNCTION create_simple_order TO authenticated;
