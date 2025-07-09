-- Function to increment ad clicks
CREATE OR REPLACE FUNCTION increment_ad_clicks(ad_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE ads 
    SET click_count = click_count + 1,
        updated_at = NOW()
    WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql;

-- Function to search users by different criteria
CREATE OR REPLACE FUNCTION search_users_by_criteria(
    search_type VARCHAR,
    search_value VARCHAR
)
RETURNS TABLE (
    id UUID,
    full_name VARCHAR,
    username VARCHAR,
    phone VARCHAR,
    email VARCHAR,
    company_name VARCHAR,
    is_verified_seller BOOLEAN
) AS $$
BEGIN
    CASE search_type
        WHEN 'phone' THEN
            RETURN QUERY
            SELECT u.id, u.full_name, u.username, u.phone, u.email, u.company_name, u.is_verified_seller
            FROM users u
            WHERE u.phone ILIKE '%' || search_value || '%'
            LIMIT 10;
        WHEN 'email' THEN
            RETURN QUERY
            SELECT u.id, u.full_name, u.username, u.phone, u.email, u.company_name, u.is_verified_seller
            FROM users u
            WHERE u.email ILIKE '%' || search_value || '%'
            LIMIT 10;
        WHEN 'username' THEN
            RETURN QUERY
            SELECT u.id, u.full_name, u.username, u.phone, u.email, u.company_name, u.is_verified_seller
            FROM users u
            WHERE u.username ILIKE '%' || search_value || '%'
            LIMIT 10;
        ELSE
            RETURN QUERY
            SELECT u.id, u.full_name, u.username, u.phone, u.email, u.company_name, u.is_verified_seller
            FROM users u
            WHERE u.full_name ILIKE '%' || search_value || '%'
               OR u.username ILIKE '%' || search_value || '%'
               OR u.phone ILIKE '%' || search_value || '%'
               OR u.email ILIKE '%' || search_value || '%'
            LIMIT 10;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Update products popularity trigger function
CREATE OR REPLACE FUNCTION update_product_popularity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products 
    SET popularity_score = (
        COALESCE(like_count, 0) * 2 + 
        COALESCE(order_count, 0) * 3 + 
        COALESCE(view_count, 0) * 0.1 + 
        COALESCE(average_rating, 0) * 10
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for popularity updates
DROP TRIGGER IF EXISTS trigger_update_popularity_on_like ON product_likes;
CREATE TRIGGER trigger_update_popularity_on_like
    AFTER INSERT OR DELETE ON product_likes
    FOR EACH ROW EXECUTE FUNCTION update_product_popularity();

DROP TRIGGER IF EXISTS trigger_update_popularity_on_order ON orders;
CREATE TRIGGER trigger_update_popularity_on_order
    AFTER INSERT ON orders
    FOR EACH ROW EXECUTE FUNCTION update_product_popularity();

-- Function to update conversation timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET updated_at = NOW(),
        last_message_at = NOW()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp when new message is added
DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON messages;
CREATE TRIGGER trigger_update_conversation_timestamp
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();
