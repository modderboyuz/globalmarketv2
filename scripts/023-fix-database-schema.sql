-- Remove books table completely
DROP TABLE IF EXISTS books CASCADE;

-- First, add the name column if it doesn't exist
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Update the name column with values from name_uz or name_en if they exist
UPDATE categories SET name = COALESCE(name_uz, name_en, 'Kategoriya') WHERE name IS NULL OR name = '';

-- Now drop the old columns
ALTER TABLE categories DROP COLUMN IF EXISTS name_uz;
ALTER TABLE categories DROP COLUMN IF EXISTS name_en;

-- Make name column NOT NULL
ALTER TABLE categories ALTER COLUMN name SET NOT NULL;

-- Update existing categories with proper names and colorful icons
UPDATE categories SET 
  name = 'Kitoblar',
  icon = '📚',
  slug = 'kitoblar'
WHERE slug = 'kitoblar';

UPDATE categories SET 
  name = 'Maktab buyumlari',
  icon = '🎒',
  slug = 'maktab-buyumlari'
WHERE slug = 'maktab-buyumlari';

UPDATE categories SET 
  name = 'Ofis jihozlari',
  icon = '🖊️',
  slug = 'ofis-jihozlari'
WHERE slug = 'ofis-jihozlari';

UPDATE categories SET 
  name = 'Elektronika',
  icon = '💻',
  slug = 'elektronika'
WHERE slug = 'elektronika';

UPDATE categories SET 
  name = 'Kiyim-kechak',
  icon = '👕',
  slug = 'kiyim-kechak'
WHERE slug = 'kiyim-kechak';

UPDATE categories SET 
  name = 'Sport buyumlari',
  icon = '⚽',
  slug = 'sport-buyumlari'
WHERE slug = 'sport-buyumlari';

-- Insert new categories with colorful icons
INSERT INTO categories (name, slug, icon, description, is_active, sort_order) VALUES
('Oyinchoqlar', 'oyinchoqlar', '🧸', 'Bolalar uchun oyinchoqlar', true, 7),
('Oshxona buyumlari', 'oshxona-buyumlari', '🍳', 'Oshxona uchun kerakli buyumlar', true, 8),
('Kitoblar va darsliklar', 'kitoblar-darsliklar', '📖', 'Turli xil kitoblar va darsliklar', true, 9),
('Musiqa asboblari', 'musiqa-asboblari', '🎸', 'Musiqa asboblari va aksessuarlar', true, 10),
('Go'zallik va parvarish', 'gozallik-parvarish', '💄', 'Go\'zallik mahsulotlari', true, 11),
('Uy-ro\'zg\'or buyumlari', 'uy-rozgor', '🏠', 'Uy uchun kerakli buyumlar', true, 12)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description;

-- Add type column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'email';

-- Update existing users based on email patterns
UPDATE users SET type = 'temp' WHERE email LIKE '%@temp.com' OR email LIKE '%telegram%';
UPDATE users SET type = 'email' WHERE type != 'temp';

-- Update products to use kitoblar category for book-type products
UPDATE products 
SET category_id = (SELECT id FROM categories WHERE slug = 'kitoblar' LIMIT 1)
WHERE product_type = 'book' OR author IS NOT NULL OR isbn IS NOT NULL;

-- Ensure all categories have proper icons
UPDATE categories SET icon = '📦' WHERE icon IS NULL OR icon = '';
