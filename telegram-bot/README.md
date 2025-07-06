# GlobalMarket Telegram Bot

Bu Node.js da yozilgan Telegram bot GlobalMarket kitob marketi uchun.

## 🚀 Tez boshlash

### 1. Dependencies o'rnatish
\`\`\`bash
npm install
\`\`\`

### 2. Environment variables sozlash
`.env` faylini yarating va quyidagi ma'lumotlarni kiriting:

\`\`\`env
TELEGRAM_BOT_TOKEN=8057847116:AAGD-kfGrw8R2ZjTOZqFkpMvNJ6pdHIDfIk
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
BOT_USERNAME=globalmarketshopbot
\`\`\`

### 3. Botni ishga tushirish
\`\`\`bash
npm start
\`\`\`

Yoki development uchun:
\`\`\`bash
npm run dev
\`\`\`

## 📋 Bot buyruqlari

### Foydalanuvchilar uchun:
- `/start` - Botni boshlash
- `/myorders` - O'z buyurtmalarini ko'rish
- `/help` - Yordam

### Adminlar uchun:
- `/orders` - Barcha buyurtmalarni ko'rish
- Buyurtma holatini o'zgartirish (inline tugmalar orqali)

## ⚙️ Sozlash

### Admin yaratish
Database da admin yaratish uchun:

\`\`\`sql
-- O'zingizning Telegram ID ni oling (@userinfobot dan)
UPDATE users SET is_admin = TRUE, telegram_id = YOUR_TELEGRAM_ID 
WHERE email = 'your-email@example.com';
\`\`\`

### Telegram ID olish
1. @userinfobot ga o'ting
2. `/start` yuboring
3. Sizning ID ingizni ko'rsatadi

## 🔧 Xususiyatlar

- ✅ Buyurtma kuzatish
- ✅ Admin panel
- ✅ Real-time bildirishnomalar
- ✅ Buyurtma holati o'zgartirish
- ✅ Foydalanuvchi buyurtmalari
- ✅ Inline keyboard tugmalari

## 📱 Foydalanish

1. Websaytdan buyurtma bering
2. Telegram bot havolasini oling
3. Botga o'ting va buyurtmangizni kuzating
4. Adminlar yangi buyurtmalar haqida avtomatik xabar oladi

## 🐛 Xatoliklarni hal qilish

### Bot ishlamayapti?
1. Token to'g'ri ekanligini tekshiring
2. Supabase ma'lumotlari to'g'ri ekanligini tekshiring
3. Internet aloqasini tekshiring

### Admin huquqlari ishlamayapti?
1. Database da `is_admin = TRUE` ekanligini tekshiring
2. `telegram_id` to'g'ri ekanligini tekshiring

### Buyurtmalar ko'rinmayapti?
1. Supabase connection tekshiring
2. Database schema to'g'ri ekanligini tekshiring

## 📞 Yordam

Muammolar bo'lsa:
1. Console loglarni tekshiring
2. Bot tokenini yangilang
3. Dependencies ni qayta o'rnating: `npm install`
