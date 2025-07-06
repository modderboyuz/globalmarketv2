-- Fix conversations table and add comprehensive admin system

-- Drop existing conversations table if exists
DROP TABLE IF EXISTS conversations CASCADE;

-- Create conversations table with proper relationships
CREATE TABLE conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read_by_buyer BOOLEAN DEFAULT FALSE,
    is_read_by_seller BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_messages table for admin panel notifications
CREATE TABLE admin_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- 'seller_application', 'product_approval', 'contact', 'book_request', 'order_issue'
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    data JSONB, -- Store additional data like user_id, product_id, etc.
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'responded'
    admin_response TEXT,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    handled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create seller_applications table
CREATE TABLE seller_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100),
    description TEXT,
    phone VARCHAR(20),
    address TEXT,
    documents JSONB, -- Store document URLs
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product_submissions table
CREATE TABLE product_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    admin_notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create contact_messages table
CREATE TABLE contact_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'new', -- 'new', 'responded', 'closed'
    admin_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create book_requests table
CREATE TABLE book_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    book_title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    isbn VARCHAR(50),
    description TEXT,
    max_price DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'fulfilled', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create advertisements table
CREATE TABLE advertisements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    link_url TEXT,
    position VARCHAR(50) DEFAULT 'banner', -- 'banner', 'sidebar', 'popup'
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_conversations_buyer_id ON conversations(buyer_id);
CREATE INDEX idx_conversations_seller_id ON conversations(seller_id);
CREATE INDEX idx_conversations_product_id ON conversations(product_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_admin_messages_type ON admin_messages(type);
CREATE INDEX idx_admin_messages_status ON admin_messages(status);
CREATE INDEX idx_seller_applications_user_id ON seller_applications(user_id);
CREATE INDEX idx_seller_applications_status ON seller_applications(status);
CREATE INDEX idx_product_submissions_product_id ON product_submissions(product_id);
CREATE INDEX idx_product_submissions_seller_id ON product_submissions(seller_id);
CREATE INDEX idx_product_submissions_status ON product_submissions(status);

-- Add RLS policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view their own conversations" ON conversations
    FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "Users can update their own conversations" ON conversations
    FOR UPDATE USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
        )
    );

CREATE POLICY "Users can send messages in their conversations" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
        )
    );

-- Admin messages policies (admin only)
CREATE POLICY "Only admins can manage admin messages" ON admin_messages
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Seller applications policies
CREATE POLICY "Users can view their own applications" ON seller_applications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own applications" ON seller_applications
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all applications" ON seller_applications
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

CREATE POLICY "Admins can update applications" ON seller_applications
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Product submissions policies
CREATE POLICY "Sellers can view their own submissions" ON product_submissions
    FOR SELECT USING (seller_id = auth.uid());

CREATE POLICY "Sellers can create submissions" ON product_submissions
    FOR INSERT WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Admins can view all submissions" ON product_submissions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

CREATE POLICY "Admins can update submissions" ON product_submissions
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Contact messages policies (public can create, admin can view)
CREATE POLICY "Anyone can create contact messages" ON contact_messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all contact messages" ON contact_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

CREATE POLICY "Admins can update contact messages" ON contact_messages
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Book requests policies
CREATE POLICY "Users can view their own book requests" ON book_requests
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create book requests" ON book_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own book requests" ON book_requests
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all book requests" ON book_requests
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Advertisements policies (public can view, admin can manage)
CREATE POLICY "Anyone can view active advertisements" ON advertisements
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage advertisements" ON advertisements
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Functions for admin notifications
CREATE OR REPLACE FUNCTION create_admin_notification(
    notification_type VARCHAR(50),
    notification_title VARCHAR(255),
    notification_content TEXT,
    notification_data JSONB DEFAULT NULL,
    creator_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO admin_messages (type, title, content, data, created_by)
    VALUES (notification_type, notification_title, notification_content, notification_data, creator_id)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to create admin notifications
CREATE OR REPLACE FUNCTION trigger_admin_notification() RETURNS TRIGGER AS $$
BEGIN
    -- Handle seller applications
    IF TG_TABLE_NAME = 'seller_applications' AND TG_OP = 'INSERT' THEN
        PERFORM create_admin_notification(
            'seller_application',
            'Yangi sotuvchi arizasi',
            'Yangi sotuvchi bo''lish arizasi keldi: ' || NEW.company_name,
            jsonb_build_object('application_id', NEW.id, 'user_id', NEW.user_id),
            NEW.user_id
        );
    END IF;
    
    -- Handle product submissions
    IF TG_TABLE_NAME = 'product_submissions' AND TG_OP = 'INSERT' THEN
        PERFORM create_admin_notification(
            'product_approval',
            'Yangi mahsulot tasdiqlash',
            'Yangi mahsulot tasdiqlash uchun yuborildi',
            jsonb_build_object('submission_id', NEW.id, 'product_id', NEW.product_id, 'seller_id', NEW.seller_id),
            NEW.seller_id
        );
    END IF;
    
    -- Handle contact messages
    IF TG_TABLE_NAME = 'contact_messages' AND TG_OP = 'INSERT' THEN
        PERFORM create_admin_notification(
            'contact',
            'Yangi murojaat',
            'Yangi murojaat keldi: ' || NEW.subject,
            jsonb_build_object('contact_id', NEW.id, 'name', NEW.name, 'phone', NEW.phone),
            NULL
        );
    END IF;
    
    -- Handle book requests
    IF TG_TABLE_NAME = 'book_requests' AND TG_OP = 'INSERT' THEN
        PERFORM create_admin_notification(
            'book_request',
            'Yangi kitob so''rovi',
            'Yangi kitob so''rovi: ' || NEW.book_title,
            jsonb_build_object('request_id', NEW.id, 'user_id', NEW.user_id),
            NEW.user_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS seller_application_notification ON seller_applications;
CREATE TRIGGER seller_application_notification
    AFTER INSERT ON seller_applications
    FOR EACH ROW EXECUTE FUNCTION trigger_admin_notification();

DROP TRIGGER IF EXISTS product_submission_notification ON product_submissions;
CREATE TRIGGER product_submission_notification
    AFTER INSERT ON product_submissions
    FOR EACH ROW EXECUTE FUNCTION trigger_admin_notification();

DROP TRIGGER IF EXISTS contact_message_notification ON contact_messages;
CREATE TRIGGER contact_message_notification
    AFTER INSERT ON contact_messages
    FOR EACH ROW EXECUTE FUNCTION trigger_admin_notification();

DROP TRIGGER IF EXISTS book_request_notification ON book_requests;
CREATE TRIGGER book_request_notification
    AFTER INSERT ON book_requests
    FOR EACH ROW EXECUTE FUNCTION trigger_admin_notification();
