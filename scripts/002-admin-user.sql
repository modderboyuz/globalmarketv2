-- Create an admin user (replace with your actual email)
INSERT INTO users (email, full_name, is_admin, telegram_id) 
VALUES ('admin@globalmarket.uz', 'Admin User', TRUE, NULL)
ON CONFLICT (email) DO UPDATE SET is_admin = TRUE;

-- Update existing user to admin (replace with your email)
-- UPDATE users SET is_admin = TRUE WHERE email = 'your-email@example.com';
