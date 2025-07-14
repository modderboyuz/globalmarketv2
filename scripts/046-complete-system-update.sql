-- Update database schema for complete system

-- Add delivery options to products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS has_delivery BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_return BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS return_policy TEXT;

-- Add delivery option to orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS with_delivery BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_cost DECIMAL(10,2) DEFAULT 0;

-- Update order workflow function
CREATE OR REPLACE FUNCTION update_order_status(
  order_id_param UUID,
  action_param TEXT,
  notes_param TEXT DEFAULT NULL,
  pickup_address_param TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  order_record RECORD;
  result JSON;
BEGIN
  -- Get current order
  SELECT * INTO order_record FROM orders WHERE id = order_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  CASE action_param
    WHEN 'agree' THEN
      -- Seller agrees to order (stage 1 -> 2)
      IF order_record.stage = 1 THEN
        UPDATE orders SET 
          stage = 2,
          is_agree = true,
          pickup_address = COALESCE(pickup_address_param, address),
          seller_notes = notes_param,
          updated_at = NOW()
        WHERE id = order_id_param;
        
        result := json_build_object('success', true, 'message', 'Buyurtma qabul qilindi');
      ELSE
        result := json_build_object('success', false, 'error', 'Invalid stage for this action');
      END IF;

    WHEN 'reject' THEN
      -- Seller rejects order (stage 1 -> 0)
      IF order_record.stage = 1 THEN
        UPDATE orders SET 
          stage = 0,
          status = 'cancelled',
          is_agree = false,
          seller_notes = notes_param,
          updated_at = NOW()
        WHERE id = order_id_param;
        
        result := json_build_object('success', true, 'message', 'Buyurtma rad etildi');
      ELSE
        result := json_build_object('success', false, 'error', 'Invalid stage for this action');
      END IF;

    WHEN 'client_went' THEN
      -- Client went to pickup (stage 2 -> 3)
      IF order_record.stage = 2 AND order_record.is_agree = true THEN
        UPDATE orders SET 
          stage = 3,
          is_client_went = true,
          client_notes = notes_param,
          updated_at = NOW()
        WHERE id = order_id_param;
        
        result := json_build_object('success', true, 'message', 'Mahsulot olishga borgan deb belgilandi');
      ELSE
        result := json_build_object('success', false, 'error', 'Invalid stage for this action');
      END IF;

    WHEN 'client_not_went' THEN
      -- Client didn't go to pickup (stage 2 -> 0)
      IF order_record.stage = 2 AND order_record.is_agree = true THEN
        UPDATE orders SET 
          stage = 0,
          status = 'cancelled',
          is_client_went = false,
          client_notes = notes_param,
          updated_at = NOW()
        WHERE id = order_id_param;
        
        result := json_build_object('success', true, 'message', 'Buyurtma bekor qilindi');
      ELSE
        result := json_build_object('success', false, 'error', 'Invalid stage for this action');
      END IF;

    WHEN 'product_given' THEN
      -- Product given to client (stage 3 -> 4)
      IF order_record.stage = 3 AND order_record.is_client_went = true THEN
        UPDATE orders SET 
          stage = 4,
          status = 'completed',
          is_client_claimed = true,
          seller_notes = notes_param,
          updated_at = NOW()
        WHERE id = order_id_param;
        
        result := json_build_object('success', true, 'message', 'Buyurtma muvaffaqiyatli yakunlandi');
      ELSE
        result := json_build_object('success', false, 'error', 'Invalid stage for this action');
      END IF;

    WHEN 'product_not_given' THEN
      -- Product not given to client (stage 3 -> 0)
      IF order_record.stage = 3 AND order_record.is_client_went = true THEN
        UPDATE orders SET 
          stage = 0,
          status = 'cancelled',
          is_client_claimed = false,
          seller_notes = notes_param,
          updated_at = NOW()
        WHERE id = order_id_param;
        
        result := json_build_object('success', true, 'message', 'Buyurtma bekor qilindi');
      ELSE
        result := json_build_object('success', false, 'error', 'Invalid stage for this action');
      END IF;

    ELSE
      result := json_build_object('success', false, 'error', 'Invalid action');
  END CASE;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix likes function to handle no results
CREATE OR REPLACE FUNCTION handle_like_toggle(
  product_id_param UUID,
  user_id_param UUID
) RETURNS JSON AS $$
DECLARE
  existing_like_id UUID;
  current_like_count INTEGER;
  is_liked BOOLEAN;
  result JSON;
BEGIN
  -- Check if like exists
  SELECT id INTO existing_like_id 
  FROM likes 
  WHERE product_id = product_id_param AND user_id = user_id_param;

  IF existing_like_id IS NOT NULL THEN
    -- Unlike: Remove the like
    DELETE FROM likes WHERE id = existing_like_id;
    is_liked := false;
  ELSE
    -- Like: Add the like
    INSERT INTO likes (product_id, user_id) VALUES (product_id_param, user_id_param);
    is_liked := true;
  END IF;

  -- Get updated like count
  SELECT COUNT(*) INTO current_like_count FROM likes WHERE product_id = product_id_param;
  
  -- Update product like count
  UPDATE products SET like_count = current_like_count WHERE id = product_id_param;

  result := json_build_object(
    'success', true,
    'liked', is_liked,
    'like_count', current_like_count
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create product applications table if not exists
CREATE TABLE IF NOT EXISTS product_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create seller applications table if not exists
CREATE TABLE IF NOT EXISTS seller_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT,
  business_type TEXT,
  experience TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contact messages table if not exists
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'responded')),
  admin_response TEXT,
  responded_by UUID REFERENCES users(id),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE product_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_applications
CREATE POLICY "Users can view their own product applications" ON product_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create product applications" ON product_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all product applications" ON product_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS policies for seller_applications
CREATE POLICY "Users can view their own seller applications" ON seller_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create seller applications" ON seller_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all seller applications" ON seller_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS policies for contact_messages
CREATE POLICY "Admins can view all contact messages" ON contact_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Anyone can create contact messages" ON contact_messages
  FOR INSERT WITH CHECK (true);

-- Update create_order function to handle delivery
CREATE OR REPLACE FUNCTION create_order(
  product_id_param UUID,
  full_name_param TEXT,
  phone_param TEXT,
  address_param TEXT,
  quantity_param INTEGER,
  user_id_param UUID DEFAULT NULL,
  with_delivery_param BOOLEAN DEFAULT false
) RETURNS JSON AS $$
DECLARE
  product_record RECORD;
  total_amount DECIMAL(10,2);
  delivery_cost DECIMAL(10,2) := 0;
  order_id UUID;
  result JSON;
BEGIN
  -- Get product details
  SELECT * INTO product_record FROM products WHERE id = product_id_param AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Product not found or inactive');
  END IF;

  -- Check stock
  IF product_record.stock_quantity < quantity_param THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient stock');
  END IF;

  -- Calculate delivery cost
  IF with_delivery_param AND product_record.has_delivery THEN
    delivery_cost := product_record.delivery_price;
  END IF;

  -- Calculate total amount
  total_amount := (product_record.price * quantity_param) + delivery_cost;

  -- Create order
  INSERT INTO orders (
    product_id,
    user_id,
    full_name,
    phone,
    address,
    quantity,
    total_amount,
    with_delivery,
    delivery_cost,
    status,
    stage,
    order_type
  ) VALUES (
    product_id_param,
    user_id_param,
    full_name_param,
    phone_param,
    address_param,
    quantity_param,
    total_amount,
    with_delivery_param,
    delivery_cost,
    'pending',
    1,
    'direct'
  ) RETURNING id INTO order_id;

  -- Update product stock
  UPDATE products 
  SET stock_quantity = stock_quantity - quantity_param,
      order_count = order_count + 1
  WHERE id = product_id_param;

  result := json_build_object(
    'success', true, 
    'order_id', order_id,
    'message', 'Order created successfully'
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
