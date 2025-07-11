-- Fix all database issues and add missing columns/tables

-- 1. Fix categories table - ensure name column exists
ALTER TABLE categories 
DROP COLUMN IF EXISTS name_uz CASCADE;

ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';

-- Update existing data if needed
UPDATE categories SET name = 'Kitoblar' WHERE slug = 'books' AND name = '';
UPDATE categories SET name = 'Daftarlar' WHERE slug = 'notebooks' AND name = '';
UPDATE categories SET name = 'Qalamlar' WHERE slug = 'pens' AND name = '';

-- 2. Fix contact_messages table - remove non-existent columns
ALTER TABLE contact_messages 
DROP COLUMN IF EXISTS book_request_author CASCADE;

-- Ensure contact_messages has correct structure
ALTER TABLE contact_messages 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS admin_response TEXT,
ADD COLUMN IF NOT EXISTS responded_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- 3. Fix company table - ensure single row
DELETE FROM company WHERE id NOT IN (
  SELECT id FROM company ORDER BY created_at LIMIT 1
);

-- Insert default company if none exists
INSERT INTO company (name, logo_url, favicon_url, created_at, updated_at)
SELECT 'GlobalMarket', '/placeholder-logo.png', '/favicon.ico', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM company);

-- 4. Add permissions column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT ARRAY['read'];

-- Update admin permissions
UPDATE users 
SET permissions = ARRAY[
  'read', 'write', 'edit', 'delete',
  'read_buyurtmalar_globalmarket', 'write_buyurtmalar_globalmarket',
  'read_buyurtmalar_boshqalar', 'write_buyurtmalar_boshqalar',
  'write_mahsulotlar_globalmarket', 'edit_mahsulotlar_globalmarket',
  'write_mahsulotlar_boshqalar', 'edit_mahsulotlar_boshqalar',
  'manage_users', 'manage_applications'
]
WHERE is_admin = true;

-- 5. Fix orders table structure for 4-step process
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS is_agree BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_client_went BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_client_claimed BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pickup_address TEXT,
ADD COLUMN IF NOT EXISTS seller_notes TEXT,
ADD COLUMN IF NOT EXISTS client_notes TEXT;

-- 6. Ensure all application tables exist with correct structure
CREATE TABLE IF NOT EXISTS seller_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT,
  business_type TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_data JSONB NOT NULL,
  application_type TEXT DEFAULT 'create' CHECK (application_type IN ('create', 'update', 'delete')),
  product_id UUID REFERENCES products(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Fix RLS policies
DROP POLICY IF EXISTS "Users can upload images" ON storage.objects;
CREATE POLICY "Users can upload images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'products' AND 
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can view images" ON storage.objects;
CREATE POLICY "Users can view images" ON storage.objects
  FOR SELECT USING (bucket_id = 'products');

DROP POLICY IF EXISTS "Users can update their images" ON storage.objects;
CREATE POLICY "Users can update their images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'products' AND 
    auth.uid() IS NOT NULL
  );

-- 8. Create function to get order stage
CREATE OR REPLACE FUNCTION get_order_stage(order_record orders)
RETURNS INTEGER AS $$
BEGIN
  -- Cancelled
  IF order_record.status = 'cancelled' THEN
    RETURN 0;
  END IF;
  
  -- Error case: client went but not agreed
  IF order_record.is_client_went = true AND order_record.is_agree = false THEN
    RETURN -1;
  END IF;
  
  -- Completed
  IF order_record.is_agree = true AND 
     order_record.is_client_went = true AND 
     order_record.is_client_claimed = true AND 
     order_record.status = 'completed' THEN
    RETURN 4;
  END IF;
  
  -- Client came
  IF order_record.is_agree = true AND order_record.is_client_went = true THEN
    RETURN 3;
  END IF;
  
  -- Agreed
  IF order_record.is_agree = true THEN
    RETURN 2;
  END IF;
  
  -- Waiting for response
  RETURN 1;
END;
$$ LANGUAGE plpgsql;

-- 9. Update indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_seller_status ON orders(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_seller_active ON products(seller_id, is_active, is_approved);
CREATE INDEX IF NOT EXISTS idx_users_roles ON users(is_admin, is_verified_seller, is_seller);

-- 10. Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
