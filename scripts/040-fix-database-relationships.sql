-- Fix database relationships and missing tables

-- First, ensure all tables exist with proper relationships
-- Fix complaints table relationship
DROP TABLE IF EXISTS public.complaints CASCADE;

CREATE TABLE public.complaints (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    complaint_text TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    admin_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create complaints for their orders" ON public.complaints
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their complaints" ON public.complaints
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view and update all complaints" ON public.complaints
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE));

-- Fix cart table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, product_id)
);

-- Enable RLS for cart_items
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Create policies for cart_items
CREATE POLICY "Users can manage their cart items" ON public.cart_items
FOR ALL USING (auth.uid() = user_id);

-- Ensure seller_applications table exists
CREATE TABLE IF NOT EXISTS public.seller_applications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    company_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100) NOT NULL,
    experience_years INTEGER DEFAULT 0,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create seller applications" ON public.seller_applications
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their applications" ON public.seller_applications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view and update all applications" ON public.seller_applications
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE));

-- Ensure product_applications table exists
CREATE TABLE IF NOT EXISTS public.product_applications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_data JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.product_applications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create product applications" ON public.product_applications
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their applications" ON public.product_applications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view and update all applications" ON public.product_applications
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE));

-- Ensure contact_messages table exists
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    admin_response TEXT,
    responded_by UUID REFERENCES public.users(id),
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can create contact messages" ON public.contact_messages
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view and update all contact messages" ON public.contact_messages
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE));

-- Add username column to users if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- Update existing admin user to have username 'admin'
UPDATE public.users SET username = 'admin' WHERE is_admin = true AND username IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON public.complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_order_id ON public.complaints(order_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_applications_status ON public.seller_applications(status);
CREATE INDEX IF NOT EXISTS idx_product_applications_status ON public.product_applications(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
