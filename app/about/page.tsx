"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Phone, Mail, Clock, Users, Package, Award, Star, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function AboutPage() {
  const router = useRouter()

  const stats = [
    { icon: Users, label: "Mijozlar", value: "1000+", color: "text-blue-600" },
    { icon: Package, label: "Mahsulotlar", value: "500+", color: "text-green-600" },
    { icon: Award, label: "Yillik tajriba", value: "5+", color: "text-purple-600" },
    { icon: Star, label: "Reyting", value: "4.9", color: "text-yellow-600" },
  ]

  const features = [
    {
      icon: "🚚",
      title: "Tez yetkazib berish",
      description: "G'uzor tumani bo'ylab 24 soat ichida yetkazib beramiz",
    },
    {
      icon: "💰",
      title: "Qulay narxlar",
      description: "Eng arzon narxlarda sifatli mahsulotlar",
    },
    {
      icon: "🛡️",
      title: "Kafolat",
      description: "Barcha mahsulotlarga kafolat beramiz",
    },
    {
      icon: "📞",
      title: "24/7 qo'llab-quvvatlash",
      description: "Har doim sizning xizmatingizdamiz",
    },
  ]

  const team = [
    {
      name: "Aziz Karimov",
      role: "Bosh direktor",
      image: "/placeholder.svg?height=200&width=200",
      description: "5 yillik tajriba bilan biznes sohasida",
    },
    {
      name: "Malika Tosheva",
      role: "Sotish bo'limi rahbari",
      image: "/placeholder.svg?height=200&width=200",
      description: "Mijozlar bilan ishlash bo'yicha mutaxassis",
    },
    {
      name: "Bobur Aliyev",
      role: "Texnik direktor",
      image: "/placeholder.svg?height=200&width=200",
      description: "IT va texnologiyalar bo'yicha ekspert",
    },
  ]

  return (
    <div className="page-container">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 hover:bg-blue-50 rounded-2xl border-2 border-transparent hover:border-blue-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Orqaga
        </Button>

        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="floating-animation mb-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl">
              <span className="text-white font-bold text-3xl">GM</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-6">GlobalMarket haqida</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Biz G'uzor tumanidagi eng yaxshi onlayn do'konmiz. Kitoblar, maktab va ofis buyumlarini eng qulay narxlarda
            taklif etamiz.
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index} className="card-beautiful text-center">
                <CardContent className="p-6">
                  <Icon className={`h-8 w-8 mx-auto mb-4 ${stat.color}`} />
                  <div className="text-3xl font-bold gradient-text mb-2">{stat.value}</div>
                  <p className="text-gray-600">{stat.label}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* About Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Company Info */}
          <div>
            <h2 className="text-3xl font-bold gradient-text mb-6">Bizning hikoyamiz</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                GlobalMarket 2019-yilda G'uzor tumanida kichik kitob do'koni sifatida boshlangan. Bugungi kunda biz
                minglab mijozlarga xizmat ko'rsatuvchi yirik onlayn platforma bo'lib oldik.
              </p>
              <p>
                Bizning maqsadimiz - har bir oilaga sifatli ta'lim materiallari va zarur buyumlarni eng qulay narxlarda
                yetkazib berishdir. Biz mahalliy jamiyatning rivojlanishiga hissa qo'shamiz.
              </p>
              <p>
                Har bir mijozimiz biz uchun muhim. Shuning uchun biz eng yaxshi xizmat ko'rsatishga harakat qilamiz va
                doimo o'zimizni takomillashtiramiz.
              </p>
            </div>

            {/* Contact Info */}
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-blue-600" />
                <span>O'zbekiston, Qashqadaryo viloyati, G'uzor tumani, Fazo yonida</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-blue-600" />
                <span>+998 90 123 45 67</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-blue-600" />
                <span>info@globalmarket.uz</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <span>Dushanba - Yakshanba: 9:00 - 21:00</span>
              </div>
            </div>
          </div>

          {/* Location Image */}
          <div className="relative">
            <Card className="card-beautiful overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-video">
                  <Image src="/assets/location.png" alt="GlobalMarket joylashuvi" fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-xl font-bold mb-2">Bizning joylashuvimiz</h3>
                    <p className="text-sm opacity-90">G'uzor tumani, Fazo yonida</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold gradient-text text-center mb-12">Nima uchun bizni tanlashadi?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="card-beautiful text-center">
                <CardContent className="p-6">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Team Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold gradient-text text-center mb-12">Bizning jamoa</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="card-beautiful text-center">
                <CardContent className="p-6">
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <Image
                      src={member.image || "/placeholder.svg"}
                      alt={member.name}
                      fill
                      className="object-cover rounded-full"
                    />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
                  <Badge className="badge-beautiful border-blue-200 text-blue-700 mb-3">{member.role}</Badge>
                  <p className="text-gray-600 text-sm">{member.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <Card className="card-beautiful">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
                  <span className="text-white text-xl">🎯</span>
                </div>
                Bizning maqsadimiz
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 leading-relaxed">
                G'uzor tumani aholisiga eng sifatli ta'lim materiallari va zarur buyumlarni eng qulay narxlarda taklif
                etish. Har bir oilaning ta'lim ehtiyojlarini qondirish va mahalliy jamiyatning rivojlanishiga hissa
                qo'shish.
              </p>
            </CardContent>
          </Card>

          <Card className="card-beautiful">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <span className="text-white text-xl">🔮</span>
                </div>
                Bizning ko'zlangan maqsadimiz
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 leading-relaxed">
                Qashqadaryo viloyatidagi eng yirik va ishonchli onlayn do'kon bo'lish. Zamonaviy texnologiyalar
                yordamida mijozlarimizga eng yaxshi xizmat ko'rsatish va mahalliy ta'lim tizimini qo'llab-quvvatlash.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <Card className="card-beautiful text-center">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold gradient-text mb-4">Bizga qo'shiling!</h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              GlobalMarket oilasining bir qismi bo'ling va eng yaxshi takliflardan birinchi bo'lib xabardor bo'ling.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => router.push("/contact")} className="btn-primary">
                Biz bilan bog'laning
              </Button>
              <Button onClick={() => router.push("/become-seller")} variant="outline" className="border-2">
                Sotuvchi bo'ling
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
