-- Revert order count logic to original state

-- Drop any triggers that might have been created
DROP TRIGGER IF EXISTS update_product_order_count_trigger ON orders;

-- Drop any functions that might have been created
DROP FUNCTION IF EXISTS update_product_order_count();
DROP FUNCTION IF EXISTS recalculate_all_order_counts();

-- Recreate the original create_simple_order function
CREATE OR REPLACE FUNCTION create_simple_order(
  product_id_param UUID,
  full_name_param TEXT,
  phone_param TEXT,
  address_param TEXT,
  quantity_param INTEGER,
  user_id_param UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  product_record RECORD;
  order_id UUID;
  total_amount DECIMAL(10,2);
  result JSON;
BEGIN
  -- Get product details
  SELECT * INTO product_record 
  FROM products 
  WHERE id = product_id_param AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Mahsulot topilmadi yoki faol emas'
    );
  END IF;
  
  -- Check stock
  IF product_record.stock_quantity < quantity_param THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Yetarli miqdorda mahsulot mavjud emas'
    );
  END IF;
  
  -- Calculate total amount
  total_amount := product_record.price * quantity_param;
  
  -- Create order
  INSERT INTO orders (
    product_id,
    full_name,
    phone,
    address,
    quantity,
    total_amount,
    user_id,
    status,
    created_at
  ) VALUES (
    product_id_param,
    full_name_param,
    phone_param,
    address_param,
    quantity_param,
    total_amount,
    user_id_param,
    'pending',
    NOW()
  ) RETURNING id INTO order_id;
  
  -- Update product stock and order count (original logic)
  UPDATE products 
  SET 
    stock_quantity = stock_quantity - quantity_param,
    order_count = COALESCE(order_count, 0) + quantity_param,
    updated_at = NOW()
  WHERE id = product_id_param;
  
  RETURN json_build_object(
    'success', true,
    'order_id', order_id,
    'total_amount', total_amount
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Buyurtma yaratishda xatolik: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_simple_order TO authenticated, anon;
