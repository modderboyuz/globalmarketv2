-- Insert sample books with proper IDs for the carousel
INSERT INTO books (id, title, author, description, price, image_url, category_id, stock_quantity, order_count, is_featured) 
SELECT 
  '1',
  'O''tkan kunlar',
  'Abdulla Qodiriy',
  'O''zbek adabiyotining eng mashhur asarlaridan biri. Bu roman o''zbek xalqining tarixiy o''tmishi, urf-odatlari va madaniyatini aks ettiradi.',
  45000,
  '/placeholder.svg?height=600&width=400',
  c.id,
  50,
  120,
  true
FROM categories c WHERE c.slug = 'fiction'
LIMIT 1
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  author = EXCLUDED.author,
  description = EXCLUDED.description,
  price = EXCLUDED.price;

INSERT INTO books (id, title, author, description, price, image_url, category_id, stock_quantity, order_count, is_featured) 
SELECT 
  '2',
  'Mehrobdan chayon',
  'Abdulla Qodiriy',
  'Klassik o''zbek romani. Muhabbat va sadoqat haqidagi ta''sirli hikoya.',
  38000,
  '/placeholder.svg?height=600&width=400',
  c.id,
  30,
  95,
  true
FROM categories c WHERE c.slug = 'fiction'
LIMIT 1
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  author = EXCLUDED.author,
  description = EXCLUDED.description,
  price = EXCLUDED.price;

INSERT INTO books (id, title, author, description, price, image_url, category_id, stock_quantity, order_count, is_featured) 
SELECT 
  '3',
  'Xamsa',
  'Alisher Navoiy',
  'Buyuk shoir Navoiyning besh dostondan iborat asari. O''zbek adabiyotining durdonasi.',
  65000,
  '/placeholder.svg?height=600&width=400',
  c.id,
  25,
  80,
  true
FROM categories c WHERE c.slug = 'fiction'
LIMIT 1
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  author = EXCLUDED.author,
  description = EXCLUDED.description,
  price = EXCLUDED.price;

INSERT INTO books (id, title, author, description, price, image_url, category_id, stock_quantity, order_count, is_featured) 
SELECT 
  '4',
  'Sarob',
  'Abdulla Qahhor',
  'Zamonaviy o''zbek adabiyotining yirik asarlaridan biri.',
  32000,
  '/placeholder.svg?height=600&width=400',
  c.id,
  40,
  67,
  true
FROM categories c WHERE c.slug = 'fiction'
LIMIT 1
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  author = EXCLUDED.author,
  description = EXCLUDED.description,
  price = EXCLUDED.price;

INSERT INTO books (id, title, author, description, price, image_url, category_id, stock_quantity, order_count, is_featured) 
SELECT 
  '5',
  'Ikki eshik orasi',
  'Ulug''bek Hamdam',
  'Zamonaviy o''zbek yozuvchisining mashhur asari.',
  28000,
  '/placeholder.svg?height=600&width=400',
  c.id,
  35,
  45,
  true
FROM categories c WHERE c.slug = 'fiction'
LIMIT 1
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  author = EXCLUDED.author,
  description = EXCLUDED.description,
  price = EXCLUDED.price;

-- Add more books for other categories
INSERT INTO books (title, author, description, price, image_url, category_id, stock_quantity, order_count) 
SELECT 
  'Fizika asoslari',
  'A. Abdullayev',
  'Fizika fanining asosiy qonunlari va tamoyillari haqida.',
  55000,
  '/placeholder.svg?height=600&width=400',
  c.id,
  20,
  30
FROM categories c WHERE c.slug = 'science'
LIMIT 1;

INSERT INTO books (title, author, description, price, image_url, category_id, stock_quantity, order_count) 
SELECT 
  'Bolalar uchun ertaklar',
  'Cho''lpon',
  'O''zbek bolalari uchun qiziqarli ertaklar to''plami.',
  25000,
  '/placeholder.svg?height=600&width=400',
  c.id,
  60,
  85
FROM categories c WHERE c.slug = 'children'
LIMIT 1;

INSERT INTO books (title, author, description, price, image_url, category_id, stock_quantity, order_count) 
SELECT 
  'O''zbekiston tarixi',
  'B. Ahmedov',
  'O''zbekiston xalqining boy tarixi haqida batafsil ma''lumot.',
  48000,
  '/placeholder.svg?height=600&width=400',
  c.id,
  15,
  40
FROM categories c WHERE c.slug = 'history'
LIMIT 1;
