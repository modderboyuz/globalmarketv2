-- Create company table for storing company information
CREATE TABLE IF NOT EXISTS company (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL DEFAULT 'GlobalMarket',
  description TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#3B82F6',
  secondary_color VARCHAR(7) DEFAULT '#8B5CF6',
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  website VARCHAR(255),
  social_links JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default company data
INSERT INTO company (name, description, logo_url, favicon_url, phone, email, address) VALUES
('GlobalMarket', 'G''uzor tumanidagi eng yaxshi onlayn do''kon', 
 'https://via.placeholder.com/200x80/3B82F6/FFFFFF?text=GlobalMarket',
 'https://via.placeholder.com/32x32/3B82F6/FFFFFF?text=GM',
 '+998958657500', 
 'info@globalmarket.uz',
 'G''uzor tumani, Qashqadaryo viloyati, O''zbekiston')
ON CONFLICT DO NOTHING;

-- Create storage bucket for products if not exists
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true)
ON CONFLICT DO NOTHING;

-- Set up RLS policies for products bucket
DO $$
BEGIN
    -- Check if policy exists before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Public Access'
    ) THEN
        CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'products');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated users can upload'
    ) THEN
        CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can update own uploads'
    ) THEN
        CREATE POLICY "Users can update own uploads" ON storage.objects FOR UPDATE USING (bucket_id = 'products' AND auth.uid()::text = (storage.foldername(name))[1]);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can delete own uploads'
    ) THEN
        CREATE POLICY "Users can delete own uploads" ON storage.objects FOR DELETE USING (bucket_id = 'products' AND auth.uid()::text = (storage.foldername(name))[1]);
    END IF;
END $$;
