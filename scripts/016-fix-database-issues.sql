-- Fix database issues and add missing columns

-- Add missing columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_image TEXT,
ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;

-- Add missing column to categories table  
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Remove foreign key constraint from ads table if exists
ALTER TABLE ads DROP CONSTRAINT IF EXISTS ads_created_by_fkey;

-- Create sell_requests table for product selling requests
CREATE TABLE IF NOT EXISTS sell_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    author TEXT,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id UUID REFERENCES categories(id),
    stock_quantity INTEGER DEFAULT 1,
    condition TEXT DEFAULT 'new',
    contact_phone TEXT NOT NULL,
    contact_email TEXT,
    location TEXT NOT NULL,
    images TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES users(id)
);

-- Create ad_requests table for advertisement requests
CREATE TABLE IF NOT EXISTS ad_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    banner_image TEXT NOT NULL,
    link_url TEXT NOT NULL,
    duration_hours INTEGER DEFAULT 24,
    price DECIMAL(10,2) DEFAULT 100000,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'expired')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_sell_requests_user_id ON sell_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_sell_requests_status ON sell_requests(status);
CREATE INDEX IF NOT EXISTS idx_ad_requests_user_id ON ad_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_requests_status ON ad_requests(status);

-- Update categories to have is_active = true by default
UPDATE categories SET is_active = true WHERE is_active IS NULL;

-- Create function to automatically expire ads
CREATE OR REPLACE FUNCTION expire_ads()
RETURNS void AS $$
BEGIN
    -- Move expired ad_requests to expired status
    UPDATE ad_requests 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active' AND expires_at < NOW();
    
    -- Deactivate expired ads
    UPDATE ads 
    SET is_active = false, updated_at = NOW()
    WHERE is_active = true AND expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (Row Level Security) for new tables
ALTER TABLE sell_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own sell requests" ON sell_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sell requests" ON sell_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sell requests" ON sell_requests
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sell requests" ON sell_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() AND users.is_admin = true
        )
    );

CREATE POLICY "Users can view their own ad requests" ON ad_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ad requests" ON ad_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all ad requests" ON ad_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() AND users.is_admin = true
        )
    );
