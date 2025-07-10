-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.product_reviews CASCADE;
DROP TABLE IF EXISTS public.complaints CASCADE;

-- Create product_reviews table
CREATE TABLE public.product_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID NOT NULL,
    user_id UUID NOT NULL,
    order_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT product_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT product_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT product_reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Enable RLS for product_reviews
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Create policy for users to create reviews for their own orders
CREATE POLICY "Users can create reviews for their own orders" ON public.product_reviews
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id AND order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()));

-- Create policy for users to read all reviews
CREATE POLICY "Users can read all reviews" ON public.product_reviews
AS PERMISSIVE FOR SELECT
TO public
USING (TRUE);

-- Create complaints table
CREATE TABLE public.complaints (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    order_id UUID NOT NULL,
    complaint_text TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    admin_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT complaints_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT complaints_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Enable RLS for complaints
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Create policy for users to create complaints for their own orders
CREATE POLICY "Users can create complaints for their own orders" ON public.complaints
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id AND order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()));

-- Create policy for admins to read and update all complaints
CREATE POLICY "Admins can read and update all complaints" ON public.complaints
AS PERMISSIVE FOR SELECT, UPDATE
TO public
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE));
