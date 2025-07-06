-- Create ads table for banner advertisements
CREATE TABLE IF NOT EXISTS ads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    link_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create index for active ads
CREATE INDEX IF NOT EXISTS idx_ads_active ON ads(is_active, expires_at);

-- Create function to increment click count
CREATE OR REPLACE FUNCTION increment_ad_clicks(ad_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE ads 
    SET click_count = click_count + 1,
        updated_at = NOW()
    WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql;

-- Insert sample ads
INSERT INTO ads (title, description, image_url, link_url, is_active) VALUES
('GlobalMarket Yangi Mahsulotlar', 'Eng yangi kitoblar va maktab buyumlari', 'https://via.placeholder.com/800x200/4F46E5/FFFFFF?text=GlobalMarket+Yangi+Mahsulotlar', 'https://globalmarketshop.uz/products', true),
('Maktab Tayyorligi', 'Yangi o''quv yili uchun barcha kerakli narsalar', 'https://via.placeholder.com/800x200/059669/FFFFFF?text=Maktab+Tayyorligi', 'https://globalmarketshop.uz/category/school-supplies', true),
('Kitoblar Chegirmasi', '30% gacha chegirma barcha kitoblarga', 'https://via.placeholder.com/800x200/DC2626/FFFFFF?text=Kitoblar+Chegirmasi', 'https://globalmarketshop.uz/category/books', true);

-- Create RLS policies for ads
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read active ads
CREATE POLICY "Allow read active ads" ON ads
    FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Allow admins to manage ads
CREATE POLICY "Allow admin manage ads" ON ads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );
