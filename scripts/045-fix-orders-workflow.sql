-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS handle_like_toggle(uuid, uuid);
DROP FUNCTION IF EXISTS create_order(uuid, text, text, text, integer, uuid);
DROP FUNCTION IF EXISTS update_order_status(uuid, text, text, text);
DROP FUNCTION IF EXISTS get_order_stage(uuid);

-- Create like toggle function
CREATE OR REPLACE FUNCTION handle_like_toggle(
  product_id_param uuid,
  user_id_param uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_like_id uuid;
  like_count integer;
  result json;
BEGIN
  -- Check if like exists
  SELECT id INTO existing_like_id
  FROM likes 
  WHERE product_id = product_id_param AND user_id = user_id_param;
  
  IF existing_like_id IS NOT NULL THEN
    -- Remove like
    DELETE FROM likes WHERE id = existing_like_id;
    
    -- Get updated count
    SELECT COUNT(*) INTO like_count FROM likes WHERE product_id = product_id_param;
    
    -- Update product like count
    UPDATE products SET like_count = like_count WHERE id = product_id_param;
    
    result := json_build_object('success', true, 'liked', false, 'like_count', like_count);
  ELSE
    -- Add like
    INSERT INTO likes (product_id, user_id) VALUES (product_id_param, user_id_param);
    
    -- Get updated count
    SELECT COUNT(*) INTO like_count FROM likes WHERE product_id = product_id_param;
    
    -- Update product like count
    UPDATE products SET like_count = like_count WHERE id = product_id_param;
    
    result := json_build_object('success', true, 'liked', true, 'like_count', like_count);
  END IF;
  
  RETURN result;
END;
$$;

-- Create order function
CREATE OR REPLACE FUNCTION create_order(
  product_id_param uuid,
  full_name_param text,
  phone_param text,
  address_param text,
  quantity_param integer DEFAULT 1,
  user_id_param uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  product_record record;
  order_id uuid;
  total_amount numeric;
  result json;
BEGIN
  -- Get product details
  SELECT * INTO product_record FROM products WHERE id = product_id_param AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Mahsulot topilmadi');
  END IF;
  
  -- Check stock
  IF product_record.stock_quantity < quantity_param THEN
    RETURN json_build_object('success', false, 'error', 'Yetarli miqdorda mahsulot yo''q');
  END IF;
  
  -- Calculate total
  total_amount := product_record.price * quantity_param;
  
  -- Create order
  INSERT INTO orders (
    user_id,
    product_id,
    full_name,
    phone,
    address,
    delivery_address,
    delivery_phone,
    quantity,
    total_amount,
    status,
    order_type,
    stage,
    is_agree,
    is_client_went,
    is_client_claimed
  ) VALUES (
    user_id_param,
    product_id_param,
    full_name_param,
    phone_param,
    address_param,
    address_param,
    phone_param,
    quantity_param,
    total_amount,
    'pending',
    'website',
    1,
    false,
    false,
    false
  ) RETURNING id INTO order_id;
  
  -- Don't update stock yet - only when order is completed
  
  result := json_build_object(
    'success', true, 
    'order_id', order_id,
    'message', 'Buyurtma muvaffaqiyatli yaratildi'
  );
  
  RETURN result;
END;
$$;

-- Create order status update function
CREATE OR REPLACE FUNCTION update_order_status(
  order_id_param uuid,
  action_param text,
  notes_param text DEFAULT NULL,
  pickup_address_param text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_record record;
  product_record record;
  result json;
BEGIN
  -- Get current order
  SELECT * INTO order_record FROM orders WHERE id = order_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Buyurtma topilmadi');
  END IF;
  
  -- Get product info
  SELECT * INTO product_record FROM products WHERE id = order_record.product_id;
  
  CASE action_param
    WHEN 'agree' THEN
      -- Seller/Admin accepts order
      IF order_record.stage = 1 THEN
        UPDATE orders SET 
          is_agree = true,
          stage = 2,
          address = COALESCE(pickup_address_param, order_record.address),
          seller_notes = notes_param,
          updated_at = NOW()
        WHERE id = order_id_param;
        
        result := json_build_object('success', true, 'message', 'Buyurtma qabul qilindi');
      ELSE
        result := json_build_object('success', false, 'error', 'Buyurtmani qabul qilish mumkin emas');
      END IF;
      
    WHEN 'reject' THEN
      -- Seller/Admin rejects order
      IF order_record.stage = 1 THEN
        UPDATE orders SET 
          is_agree = false,
          status = 'cancelled',
          stage = 0,
          seller_notes = notes_param,
          updated_at = NOW()
        WHERE id = order_id_param;
        
        result := json_build_object('success', true, 'message', 'Buyurtma rad etildi');
      ELSE
        result := json_build_object('success', false, 'error', 'Buyurtmani rad etish mumkin emas');
      END IF;
      
    WHEN 'client_went' THEN
      -- Client confirms they went to pickup
      IF order_record.stage = 2 AND order_record.is_agree = true THEN
        UPDATE orders SET 
          is_client_went = true,
          stage = 3,
          client_notes = notes_param,
          updated_at = NOW()
        WHERE id = order_id_param;
        
        result := json_build_object('success', true, 'message', 'Mahsulot olishga borgan tasdiqlandi');
      ELSE
        result := json_build_object('success', false, 'error', 'Bu amalni bajarish mumkin emas');
      END IF;
      
    WHEN 'client_not_went' THEN
      -- Client confirms they didn't go to pickup
      IF order_record.stage = 2 AND order_record.is_agree = true THEN
        UPDATE orders SET 
          is_client_went = false,
          status = 'cancelled',
          stage = 0,
          client_notes = notes_param,
          updated_at = NOW()
        WHERE id = order_id_param;
        
        result := json_build_object('success', true, 'message', 'Buyurtma bekor qilindi');
      ELSE
        result := json_build_object('success', false, 'error', 'Bu amalni bajarish mumkin emas');
      END IF;
      
    WHEN 'product_given' THEN
      -- Seller confirms product was given
      IF order_record.stage = 3 AND order_record.is_client_went = true THEN
        UPDATE orders SET 
          is_client_claimed = true,
          status = 'completed',
          stage = 4,
          seller_notes = notes_param,
          updated_at = NOW()
        WHERE id = order_id_param;
        
        -- Update product stock and order count
        UPDATE products SET 
          stock_quantity = stock_quantity - order_record.quantity,
          order_count = order_count + 1
        WHERE id = order_record.product_id;
        
        result := json_build_object('success', true, 'message', 'Buyurtma yakunlandi');
      ELSE
        result := json_build_object('success', false, 'error', 'Mahsulot berilganini tasdiqlash mumkin emas');
      END IF;
      
    WHEN 'product_not_given' THEN
      -- Seller confirms product was not given
      IF order_record.stage = 3 THEN
        UPDATE orders SET 
          status = 'cancelled',
          stage = 0,
          seller_notes = notes_param,
          updated_at = NOW()
        WHERE id = order_id_param;
        
        result := json_build_object('success', true, 'message', 'Buyurtma bekor qilindi');
      ELSE
        result := json_build_object('success', false, 'error', 'Bu amalni bajarish mumkin emas');
      END IF;
      
    ELSE
      result := json_build_object('success', false, 'error', 'Noto''g''ri amal');
  END CASE;
  
  RETURN result;
END;
$$;

-- Create function to get order stage
CREATE OR REPLACE FUNCTION get_order_stage(order_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_record record;
BEGIN
  SELECT * INTO order_record FROM orders WHERE id = order_id_param;
  
  IF NOT FOUND THEN
    RETURN -1;
  END IF;
  
  RETURN order_record.stage;
END;
$$;

-- Add stage column to orders table if not exists
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stage integer DEFAULT 1;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'website';

-- Update existing orders to have proper stage values
UPDATE orders SET 
  stage = CASE 
    WHEN status = 'cancelled' THEN 0
    WHEN is_agree IS NULL AND status = 'pending' THEN 1
    WHEN is_agree = false AND status = 'cancelled' THEN 0
    WHEN is_agree = true AND is_client_went IS NULL AND status = 'pending' THEN 2
    WHEN is_agree = true AND is_client_went = false AND status = 'cancelled' THEN 0
    WHEN is_agree = true AND is_client_went = true AND is_client_claimed IS NULL AND status = 'pending' THEN 3
    WHEN is_agree = true AND is_client_went = true AND is_client_claimed = true AND status = 'completed' THEN 4
    ELSE 1
  END
WHERE stage IS NULL;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION handle_like_toggle(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_order(uuid, text, text, text, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_order_status(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_order_stage(uuid) TO authenticated;
