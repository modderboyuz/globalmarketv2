"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase" // Sizning client-side Supabase clientingiz

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Supabase Auth callback URLdan sessiya ma'lumotlarini avtomatik oladi
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Auth callback error:", error)
          router.push("/login?error=auth_error")
          return
        }

        if (data.session?.user) {
          const user = data.session.user // Supabase auth.users dagi foydalanuvchi obyekti

          // public.users jadvalida foydalanuvchi mavjudligini tekshirish
          const { data: userData, error: userError } = await supabase
            .from("users") // Sizning public.users jadvalingiz nomi 'users'
            .select("*") // Barcha maydonlarni select qilamiz, keyinchalik yangilash uchun
            .eq("id", user.id)
            .single()

          if (userError && userError.code === "PGRST116") {
            // "PGRST116" - bu "0 rows returned" (foydalanuvchi topilmadi) degani.
            // Foydalanuvchi public.users da mavjud emas, uni yaratamiz
            console.log(`Creating new public user for ID: ${user.id}`);
            const { error: createError } = await supabase.from("users").insert({
              id: user.id, // Auth.users dagi ID
              email: user.email || null, // Email agar mavjud bo'lsa
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || "", // OAuth provayderdan keladigan ism
              phone: user.user_metadata?.phone || null,
              address: "", // Default bo'sh
              type: user.app_metadata?.provider || user.user_metadata?.provider || "oauth", // Qaysi provayder orqali kirganligi
              is_seller: false, // Default false
              is_verified_seller: false, // Default false
              is_admin: false, // Default false
              created_at: new Date().toISOString(), // Birinchi yaratilgan vaqt
              last_sign_in_at: new Date().toISOString(), // Oxirgi kirish vaqti
              // Agar telegram_id ham bo'lishi kerak bo'lsa, uni ham shu yerga qo'shishingiz mumkin
              // telegram_id: user.user_metadata?.telegram_id || null, 
            })

            if (createError) {
              console.error("Error creating user in public.users:", createError)
              // Xato yuz bersa, foydalanuvchini login sahifasiga qaytarish maqsadga muvofiq
              router.push("/login?error=user_creation_failed");
              return;
            }
            console.log(`Public user created for ID: ${user.id}`);

          } else if (userError) {
            // Boshqa turdagi xato yuz bersa (PGRST116 dan boshqa)
            console.error("Error checking user in public.users:", userError);
            router.push("/login?error=db_check_error");
            return;
          } else {
            // Foydalanuvchi public.users da mavjud, ma'lumotlarini yangilaymiz
            console.log(`Updating existing public user for ID: ${user.id}`);
            const { error: updateError } = await supabase.from("users").update({
              email: user.email || userData.email, // Email yangilanishi mumkin
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || userData.full_name,
              phone: user.user_metadata?.phone || userData.phone,
              last_sign_in_at: new Date().toISOString(), // Oxirgi kirish vaqtini yangilaymiz
              // Boshqa maydonlarni ham yangilashingiz mumkin, agar kerak bo'lsa
              // is_seller: user.user_metadata?.is_seller || userData.is_seller, // Agar oAuth orqali kelayotgan bo'lsa
            }).eq("id", user.id);

            if (updateError) {
              console.error("Error updating user in public.users:", updateError);
              // Yangilashda xato bo'lsa ham, keyingi sahifaga o'tkazishimiz mumkin
              // Chunki foydalanuvchi allaqachon auth.usersda kirgan
            }
            console.log(`Public user updated for ID: ${user.id}`);
          }

          // Muvaffaqiyatli, bosh sahifaga yo'naltirish
          router.push("/");
        } else {
          // Session yo'q yoki user topilmadi, login sahifasiga qaytarish
          console.log("No session or user found after auth callback.");
          router.push("/login");
        }
      } catch (error) {
        console.error("Unexpected error in AuthCallback:", error);
        router.push("/login?error=unexpected_error");
      }
    }

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Tizimga kirilmoqda...</p>
      </div>
    </div>
  );
}
