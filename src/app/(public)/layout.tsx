import Link from "next/link"
import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/Footer"
import { Sparkles } from "lucide-react"
import { MobileNavMenu } from "@/components/navigation/MobileNavMenu"

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <div className="min-h-screen bg-linear-to-b from-white via-white to-gray-50">
      <nav className="bg-white/80 backdrop-blur-xs border-b sticky top-0 z-50 shadow-xs">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6 sm:gap-8 min-w-0">
              <Link href="/" className="flex items-center gap-2 text-lg sm:text-xl font-bold min-w-0">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="truncate">Платформа обучения</span>
              </Link>
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/catalog"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary hover:bg-primary/5 rounded-md transition-all"
                >
                  Каталог
                </Link>
                <Link
                  href="/leaderboard"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary hover:bg-primary/5 rounded-md transition-all"
                >
                  Лидеры
                </Link>
                <Link
                  href="/donate"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary hover:bg-primary/5 rounded-md transition-all"
                >
                  Донат
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-3">
                {session ? (
                  <Link href="/dashboard">
                    <Button size="sm">В кабинет</Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/login">
                      <Button variant="outline" size="sm">
                        Войти
                      </Button>
                    </Link>
                    <Link href="/register">
                      <Button size="sm">Регистрация</Button>
                    </Link>
                  </>
                )}
              </div>
              <MobileNavMenu
                items={[
                  { href: "/catalog", label: "Каталог" },
                  { href: "/leaderboard", label: "Лидеры" },
                  { href: "/donate", label: "Донат" },
                ]}
              >
                <div className="flex flex-col gap-2">
                  {session ? (
                    <Link href="/dashboard" className="w-full">
                      <Button className="w-full">В кабинет</Button>
                    </Link>
                  ) : (
                    <>
                      <Link href="/login" className="w-full">
                        <Button variant="outline" className="w-full">
                          Войти
                        </Button>
                      </Link>
                      <Link href="/register" className="w-full">
                        <Button className="w-full">Регистрация</Button>
                      </Link>
                    </>
                  )}
                </div>
              </MobileNavMenu>
            </div>
          </div>
        </div>
      </nav>
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      <Footer />
    </div>
  )
}
