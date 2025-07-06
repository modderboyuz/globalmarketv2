-- Admin user yaratish uchun script
-- O'zingizning ma'lumotlaringizni kiriting

-- 1. Email orqali admin yaratish
INSERT INTO users (email, full_name, is_admin, telegram_id) 
VALUES ('admin@globalmarket.uz', 'Admin User', TRUE, NULL)
ON CONFLICT (email) DO UPDATE SET 
  is_admin = TRUE,
  updated_at = NOW();

-- 2. Telegram ID bilan admin yaratish (Telegram ID ni o'zingiznikiga almashtiring)
-- Telegram ID ni olish uchun @userinfobot ga /start yuboring
INSERT INTO users (email, full_name, is_admin, telegram_id) 
VALUES ('telegram_admin@globalmarket.uz', 'Telegram Admin', TRUE, 123456789)
ON CONFLICT (email) DO UPDATE SET 
  is_admin = TRUE,
  telegram_id = 123456789,
  updated_at = NOW();

-- 3. Mavjud foydalanuvchini admin qilish
-- UPDATE users SET is_admin = TRUE WHERE email = 'your-email@example.com';

-- 4. Telegram ID ni mavjud foydalanuvchiga qo'shish
-- UPDATE users SET telegram_id = 123456789 WHERE email = 'your-email@example.com';

-- Adminlarni ko'rish
SELECT id, email, full_name, is_admin, telegram_id, created_at 
FROM users 
WHERE is_admin = TRUE;
