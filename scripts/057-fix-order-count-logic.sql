-- First, reset all order_count to 0
UPDATE products SET order_count = 0;

-- Create a function to recalculate order_count based on completed orders only
CREATE OR REPLACE FUNCTION recalculate_product_order_counts()
RETURNS void AS $$
BEGIN
  -- Update order_count for all products based on completed orders
  UPDATE products 
  SET order_count = COALESCE(completed_orders.total_quantity, 0)
  FROM (
    SELECT 
      product_id,
      SUM(quantity) as total_quantity
    FROM orders 
    WHERE status = 'completed' 
      AND is_client_claimed = true
    GROUP BY product_id
  ) completed_orders
  WHERE products.id = completed_orders.product_id;
END;
$$ LANGUAGE plpgsql;

-- Run the function to fix existing data
SELECT recalculate_product_order_counts();

-- Create a trigger function to automatically update order_count when order status changes
CREATE OR REPLACE FUNCTION update_product_order_count()
RETURNS TRIGGER AS $$
BEGIN
  -- If order is being completed
  IF NEW.status = 'completed' AND NEW.is_client_claimed = true AND 
     (OLD.status != 'completed' OR OLD.is_client_claimed != true) THEN
    
    UPDATE products 
    SET order_count = order_count + NEW.quantity
    WHERE id = NEW.product_id;
    
  -- If order was completed but now being changed to not completed
  ELSIF OLD.status = 'completed' AND OLD.is_client_claimed = true AND 
        (NEW.status != 'completed' OR NEW.is_client_claimed != true) THEN
    
    UPDATE products 
    SET order_count = GREATEST(0, order_count - OLD.quantity)
    WHERE id = OLD.product_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_product_order_count ON orders;
CREATE TRIGGER trigger_update_product_order_count
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_product_order_count();

-- Also update the create_simple_order function to not increment order_count on creation
CREATE OR REPLACE FUNCTION create_simple_order(
  product_id_param UUID,
  full_name_param TEXT,
  phone_param TEXT,
  address_param TEXT,
  quantity_param INTEGER,
  user_id_param UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  product_record RECORD;
  order_id UUID;
  total_amount NUMERIC;
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
  IF product_record.stock_quantity IS NOT NULL AND product_record.stock_quantity < quantity_param THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Yetarli miqdorda mahsulot yo''q'
    );
  END IF;
  
  -- Calculate total amount
  total_amount := product_record.price * quantity_param;
  
  -- Create order
  INSERT INTO orders (
    product_id,
    user_id,
    full_name,
    phone,
    address,
    delivery_address,
    delivery_phone,
    quantity,
    total_amount,
    status,
    created_at,
    updated_at
  ) VALUES (
    product_id_param,
    user_id_param,
    full_name_param,
    phone_param,
    address_param,
    address_param,
    phone_param,
    quantity_param,
    total_amount,
    'pending',
    NOW(),
    NOW()
  ) RETURNING id INTO order_id;
  
  -- Update product stock if applicable (but don't update order_count yet)
  IF product_record.stock_quantity IS NOT NULL THEN
    UPDATE products
    SET stock_quantity = stock_quantity - quantity_param,
        updated_at = NOW()
    WHERE id = product_id_param;
  END IF;
  
  -- Update product views
  UPDATE products
  SET views = COALESCE(views, 0) + 1,
      updated_at = NOW()
  WHERE id = product_id_param;
  
  RETURN json_build_object(
    'success', true,
    'order_id', order_id,
    'total_amount', total_amount
  );
END;
$$ LANGUAGE plpgsql;
