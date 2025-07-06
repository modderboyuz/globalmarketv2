-- Add SQL functions for like count management
CREATE OR REPLACE FUNCTION increment_like_count(product_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE products 
    SET like_count = like_count + 1 
    WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_like_count(product_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE products 
    SET like_count = GREATEST(like_count - 1, 0) 
    WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;

-- Create storage bucket for products
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true);

-- Create storage policy for products bucket
CREATE POLICY "Anyone can view product images" ON storage.objects FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "Authenticated users can upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own product images" ON storage.objects FOR UPDATE USING (bucket_id = 'products' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own product images" ON storage.objects FOR DELETE USING (bucket_id = 'products' AND auth.role() = 'authenticated');
