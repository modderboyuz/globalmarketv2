-- Remove seller_id from orders table and use product_id to get seller info

-- 1. Drop existing foreign key constraint if exists
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_seller_id_fkey;

-- 2. Remove seller_id column from orders table
ALTER TABLE orders DROP COLUMN IF EXISTS seller_id;

-- 3. Ensure product_id exists and is properly constrained
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE CASCADE;

-- 4. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_product ON orders(user_id, product_id);

-- 5. Update get_user_stats function to work without seller_id in orders
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS TABLE(
  total_products BIGINT,
  total_orders BIGINT,
  total_sales NUMERIC,
  pending_orders BIGINT,
  completed_orders BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total products for this seller
    (SELECT COUNT(*) FROM products WHERE seller_id = user_uuid AND is_active = true)::BIGINT,
    
    -- Total orders for this seller's products
    (SELECT COUNT(*) 
     FROM orders o 
     JOIN products p ON o.product_id = p.id 
     WHERE p.seller_id = user_uuid)::BIGINT,
    
    -- Total sales amount
    (SELECT COALESCE(SUM(o.total_amount), 0) 
     FROM orders o 
     JOIN products p ON o.product_id = p.id 
     WHERE p.seller_id = user_uuid AND o.status = 'completed')::NUMERIC,
    
    -- Pending orders
    (SELECT COUNT(*) 
     FROM orders o 
     JOIN products p ON o.product_id = p.id 
     WHERE p.seller_id = user_uuid AND o.status = 'pending')::BIGINT,
    
    -- Completed orders
    (SELECT COUNT(*) 
     FROM orders o 
     JOIN products p ON o.product_id = p.id 
     WHERE p.seller_id = user_uuid AND o.status = 'completed')::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create view for orders with seller info
CREATE OR REPLACE VIEW orders_with_seller AS
SELECT 
  o.*,
  p.seller_id,
  p.name as product_name,
  p.price as product_price,
  p.image_url as product_image,
  u.full_name as seller_name,
  u.company_name as seller_company,
  u.phone as seller_phone,
  u.email as seller_email
FROM orders o
JOIN products p ON o.product_id = p.id
JOIN users u ON p.seller_id = u.id;

-- 7. Update RLS policies for orders
DROP POLICY IF EXISTS "Users can view their orders" ON orders;
CREATE POLICY "Users can view their orders" ON orders 
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() IN (
      SELECT p.seller_id 
      FROM products p 
      WHERE p.id = orders.product_id
    )
  );

DROP POLICY IF EXISTS "Users can insert orders" ON orders;
CREATE POLICY "Users can insert orders" ON orders 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Sellers can update their orders" ON orders;
CREATE POLICY "Sellers can update their orders" ON orders 
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT p.seller_id 
      FROM products p 
      WHERE p.id = orders.product_id
    )
  );

-- 8. Create function to get seller orders
CREATE OR REPLACE FUNCTION get_seller_orders(seller_uuid UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  product_id UUID,
  quantity INTEGER,
  total_amount NUMERIC,
  status TEXT,
  delivery_address TEXT,
  delivery_phone TEXT,
  is_agree BOOLEAN,
  is_client_went BOOLEAN,
  is_client_claimed BOOLEAN,
  pickup_address TEXT,
  seller_notes TEXT,
  client_notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  product_name TEXT,
  product_price NUMERIC,
  product_image TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.user_id,
    o.product_id,
    o.quantity,
    o.total_amount,
    o.status,
    o.delivery_address,
    o.delivery_phone,
    o.is_agree,
    o.is_client_went,
    o.is_client_claimed,
    o.pickup_address,
    o.seller_notes,
    o.client_notes,
    o.created_at,
    o.updated_at,
    p.name as product_name,
    p.price as product_price,
    p.image_url as product_image,
    u.full_name as customer_name,
    u.phone as customer_phone,
    u.email as customer_email
  FROM orders o
  JOIN products p ON o.product_id = p.id
  JOIN users u ON o.user_id = u.id
  WHERE p.seller_id = seller_uuid
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to get customer orders
CREATE OR REPLACE FUNCTION get_customer_orders(customer_uuid UUID)
RETURNS TABLE(
  id UUID,
  product_id UUID,
  quantity INTEGER,
  total_amount NUMERIC,
  status TEXT,
  delivery_address TEXT,
  delivery_phone TEXT,
  is_agree BOOLEAN,
  is_client_went BOOLEAN,
  is_client_claimed BOOLEAN,
  pickup_address TEXT,
  seller_notes TEXT,
  client_notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  product_name TEXT,
  product_price NUMERIC,
  product_image TEXT,
  seller_name TEXT,
  seller_company TEXT,
  seller_phone TEXT,
  seller_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.product_id,
    o.quantity,
    o.total_amount,
    o.status,
    o.delivery_address,
    o.delivery_phone,
    o.is_agree,
    o.is_client_went,
    o.is_client_claimed,
    o.pickup_address,
    o.seller_notes,
    o.client_notes,
    o.created_at,
    o.updated_at,
    p.name as product_name,
    p.price as product_price,
    p.image_url as product_image,
    u.full_name as seller_name,
    u.company_name as seller_company,
    u.phone as seller_phone,
    u.email as seller_email
  FROM orders o
  JOIN products p ON o.product_id = p.id
  JOIN users u ON p.seller_id = u.id
  WHERE o.user_id = customer_uuid
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Grant permissions
GRANT SELECT ON orders_with_seller TO authenticated;
GRANT EXECUTE ON FUNCTION get_seller_orders(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_orders(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO authenticated;

-- 11. Update any existing orders to ensure they have product_id
-- This is just a safety check - in practice, orders should already have product_id
UPDATE orders 
SET updated_at = NOW() 
WHERE product_id IS NOT NULL;

-- 12. Add constraint to ensure product_id is not null
ALTER TABLE orders 
ALTER COLUMN product_id SET NOT NULL;

-- 13. Create trigger to update order total when product price changes
CREATE OR REPLACE FUNCTION update_order_total_on_product_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update orders total_amount when product price changes
  IF OLD.price != NEW.price THEN
    UPDATE orders 
    SET total_amount = NEW.price * quantity,
        updated_at = NOW()
    WHERE product_id = NEW.id 
    AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_order_total ON products;
CREATE TRIGGER trigger_update_order_total
  AFTER UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_order_total_on_product_change();
