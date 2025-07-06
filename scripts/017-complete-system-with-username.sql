-- Complete system upgrade with username and telegram integration

-- Add username column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

-- Create index for username
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Update existing users with random usernames if they don't have one
UPDATE users 
SET username = 'user_' || SUBSTRING(id::text, 1, 8)
WHERE username IS NULL;

-- Create function to generate unique username
CREATE OR REPLACE FUNCTION generate_unique_username(base_name TEXT)
RETURNS TEXT AS $$
DECLARE
    new_username TEXT;
    counter INTEGER := 1;
BEGIN
    -- Clean the base name (remove spaces, special chars, make lowercase)
    base_name := LOWER(REGEXP_REPLACE(base_name, '[^a-zA-Z0-9]', '', 'g'));
    
    -- Limit to 20 characters
    base_name := SUBSTRING(base_name, 1, 20);
    
    new_username := base_name;
    
    -- Check if username exists and increment counter if needed
    WHILE EXISTS (SELECT 1 FROM users WHERE username = new_username) LOOP
        new_username := base_name || counter::text;
        counter := counter + 1;
    END LOOP;
    
    RETURN new_username;
END;
$$ LANGUAGE plpgsql;

-- Create user_connections table for tracking telegram-website connections
CREATE TABLE IF NOT EXISTS user_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    telegram_id BIGINT,
    connection_type TEXT DEFAULT 'telegram' CHECK (connection_type IN ('telegram', 'google', 'email')),
    connection_data JSONB DEFAULT '{}',
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user_connections
CREATE INDEX IF NOT EXISTS idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_telegram_id ON user_connections(telegram_id);

-- Create conversation_participants table for better message handling
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(conversation_id, user_id)
);

-- Add username search function
CREATE OR REPLACE FUNCTION search_users_by_username(search_term TEXT)
RETURNS TABLE (
    id UUID,
    username TEXT,
    full_name TEXT,
    profile_image TEXT,
    is_verified_seller BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.full_name,
        u.profile_image,
        u.is_verified_seller
    FROM users u
    WHERE 
        u.username ILIKE '%' || search_term || '%' 
        OR u.full_name ILIKE '%' || search_term || '%'
    ORDER BY 
        CASE WHEN u.username = search_term THEN 1 ELSE 2 END,
        u.username
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle telegram connection
CREATE OR REPLACE FUNCTION connect_telegram_to_user(
    p_email TEXT,
    p_telegram_id BIGINT,
    p_full_name TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    user_record users%ROWTYPE;
    connection_record user_connections%ROWTYPE;
    result JSON;
BEGIN
    -- Find user by email
    SELECT * INTO user_record FROM users WHERE email = p_email;
    
    IF NOT FOUND THEN
        result := json_build_object(
            'success', false,
            'message', 'User not found with this email'
        );
        RETURN result;
    END IF;
    
    -- Update user telegram_id and other info if provided
    UPDATE users 
    SET 
        telegram_id = p_telegram_id,
        full_name = COALESCE(p_full_name, full_name),
        phone = COALESCE(p_phone, phone),
        updated_at = NOW()
    WHERE id = user_record.id;
    
    -- Create or update connection record
    INSERT INTO user_connections (user_id, telegram_id, connection_type, connection_data, is_verified)
    VALUES (
        user_record.id, 
        p_telegram_id, 
        'telegram', 
        json_build_object('full_name', p_full_name, 'phone', p_phone),
        true
    )
    ON CONFLICT (user_id, telegram_id) 
    DO UPDATE SET 
        connection_data = json_build_object('full_name', p_full_name, 'phone', p_phone),
        is_verified = true,
        updated_at = NOW();
    
    result := json_build_object(
        'success', true,
        'message', 'Telegram successfully connected',
        'user_id', user_record.id,
        'username', user_record.username
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update sell_requests table structure
ALTER TABLE sell_requests 
ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'physical',
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS isbn TEXT,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'uz',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create product_analytics table for tracking
CREATE TABLE IF NOT EXISTS product_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('view', 'like', 'share', 'add_to_cart', 'purchase')),
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for analytics
CREATE INDEX IF NOT EXISTS idx_product_analytics_product_id ON product_analytics(product_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_user_id ON product_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_action_type ON product_analytics(action_type);
CREATE INDEX IF NOT EXISTS idx_product_analytics_created_at ON product_analytics(created_at);

-- Enable RLS for new tables
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own connections" ON user_connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connections" ON user_connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections" ON user_connections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view conversation participants" ON conversation_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations c 
            WHERE c.id = conversation_id 
            AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
        )
    );

CREATE POLICY "Users can view product analytics" ON product_analytics
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM products p 
            WHERE p.id = product_id AND p.seller_id = auth.uid()
        )
    );

-- Create trigger to auto-generate username for new users
CREATE OR REPLACE FUNCTION auto_generate_username()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.username IS NULL THEN
        NEW.username := generate_unique_username(COALESCE(NEW.full_name, 'user'));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_username
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_username();

-- Update existing null usernames
UPDATE users 
SET username = generate_unique_username(COALESCE(full_name, 'user'))
WHERE username IS NULL;

-- Create function to get user stats
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'total_products', COALESCE(products_count, 0),
        'total_orders', COALESCE(orders_count, 0),
        'total_revenue', COALESCE(total_revenue, 0),
        'avg_rating', COALESCE(avg_rating, 0),
        'total_views', COALESCE(total_views, 0),
        'followers_count', COALESCE(followers_count, 0),
        'following_count', COALESCE(following_count, 0)
    ) INTO stats
    FROM (
        SELECT 
            (SELECT COUNT(*) FROM products WHERE seller_id = p_user_id AND is_active = true) as products_count,
            (SELECT COUNT(*) FROM orders o JOIN products p ON o.product_id = p.id WHERE p.seller_id = p_user_id) as orders_count,
            (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o JOIN products p ON o.product_id = p.id WHERE p.seller_id = p_user_id AND o.status = 'completed') as total_revenue,
            (SELECT COALESCE(AVG(p.average_rating), 0) FROM products p WHERE p.seller_id = p_user_id) as avg_rating,
            (SELECT COALESCE(SUM(pa.action_type = 'view'), 0) FROM product_analytics pa JOIN products p ON pa.product_id = p.id WHERE p.seller_id = p_user_id) as total_views,
            0 as followers_count,
            0 as following_count
    ) s;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql;
