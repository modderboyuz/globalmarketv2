-- Fix database issues and add missing columns

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;

-- Add missing columns to categories table  
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Fix ads table - remove foreign key constraint and make created_by nullable
ALTER TABLE ads DROP CONSTRAINT IF EXISTS ads_created_by_fkey;
ALTER TABLE ads ALTER COLUMN created_by DROP NOT NULL;

-- Update existing ads to remove created_by reference
UPDATE ads SET created_by = NULL WHERE created_by IS NOT NULL;

-- Insert sample ads without created_by
DELETE FROM ads;
INSERT INTO ads (title, description, image_url, link_url, is_active) VALUES
('GlobalMarket Yangi Mahsulotlar', 'Eng yangi kitoblar va maktab buyumlari', 'https://via.placeholder.com/800x200/4F46E5/FFFFFF?text=GlobalMarket+Yangi+Mahsulotlar', 'https://globalmarketshop.uz/products', true),
('Maktab Tayyorligi', 'Yangi o''quv yili uchun barcha kerakli narsalar', 'https://via.placeholder.com/800x200/059669/FFFFFF?text=Maktab+Tayyorligi', 'https://globalmarketshop.uz/category/school-supplies', true),
('Kitoblar Chegirmasi', '30% gacha chegirma barcha kitoblarga', 'https://via.placeholder.com/800x200/DC2626/FFFFFF?text=Kitoblar+Chegirmasi', 'https://globalmarketshop.uz/category/books', true);

-- Create sell_requests table for product selling requests
CREATE TABLE IF NOT EXISTS sell_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id UUID REFERENCES categories(id),
    stock_quantity INTEGER DEFAULT 1,
    condition VARCHAR(50) DEFAULT 'new',
    contact_phone VARCHAR(20) NOT NULL,
    contact_email VARCHAR(255),
    location VARCHAR(255) NOT NULL,
    images JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS for sell_requests
ALTER TABLE sell_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sell requests" ON sell_requests
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create sell requests" ON sell_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all sell requests" ON sell_requests
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

CREATE POLICY "Admins can update sell requests" ON sell_requests
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Function to notify admins about new sell requests
CREATE OR REPLACE FUNCTION notify_admin_sell_request()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO admin_messages (type, title, content, data, created_by)
    VALUES (
        'sell_request',
        'Yangi mahsulot sotish so''rovi',
        'Yangi mahsulot sotish so''rovi: ' || NEW.product_name || ' - ' || NEW.price::text || ' so''m',
        jsonb_build_object(
            'sell_request_id', NEW.id,
            'user_id', NEW.user_id,
            'product_name', NEW.product_name,
            'price', NEW.price,
            'contact_phone', NEW.contact_phone,
            'location', NEW.location
        ),
        NEW.user_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for sell request notifications
DROP TRIGGER IF EXISTS sell_request_notification ON sell_requests;
CREATE TRIGGER sell_request_notification
    AFTER INSERT ON sell_requests
    FOR EACH ROW EXECUTE FUNCTION notify_admin_sell_request();

-- Update categories to be active by default
UPDATE categories SET is_active = true WHERE is_active IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_sell_requests_status ON sell_requests(status);
CREATE INDEX IF NOT EXISTS idx_sell_requests_user_id ON sell_requests(user_id);
