import { requireAuth } from "@/lib/auth-helpers"
import Link from "next/link"
import { LogoutButton } from "@/components/LogoutButton"
import { NotificationsDropdown } from "@/components/NotificationsDropdown"
import { Footer } from "@/components/Footer"
import { MobileNavMenu } from "@/components/navigation/MobileNavMenu"
import { Button } from "@/components/ui/button"

const roleLabels: Record<string, string> = {
  STUDENT: "Студент",
  TEACHER: "Преподаватель",
  MODERATOR: "Модератор",
  MANAGER: "Менеджер",
  ADMIN: "Администратор",
}

export const dynamic = "force-dynamic"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth()

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      <nav className="bg-white/80 backdrop-blur-xs border-b sticky top-0 z-50 shadow-xs">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-xl font-bold bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
                🎓 Обучение
              </Link>
              <div className="hidden md:flex items-center gap-1">
                <Link 
                  href="/dashboard" 
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary hover:bg-primary/5 rounded-md transition-all duration-200 hover:scale-105"
                >
                  Главная
                </Link>
                <Link 
                  href="/courses" 
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary hover:bg-primary/5 rounded-md transition-all duration-200 hover:scale-105"
                >
                  Курсы
                </Link>
                <Link 
                  href="/assignments" 
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary hover:bg-primary/5 rounded-md transition-all duration-200 hover:scale-105"
                >
                  Задания
                </Link>
                <Link 
                  href="/favorites" 
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary hover:bg-primary/5 rounded-md transition-all duration-200 hover:scale-105"
                >
                  Избранное
                </Link>
                <Link
                  href="/leaderboard"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary hover:bg-primary/5 rounded-md transition-all duration-200 hover:scale-105"
                >
                  Лидеры
                </Link>
                {session.user.role === "ADMIN" && (
                  <Link 
                    href="/admin" 
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary hover:bg-primary/5 rounded-md transition-all duration-200 hover:scale-105"
                  >
                    Админ-панель
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <MobileNavMenu
                items={[
                  { href: "/dashboard", label: "Главная" },
                  { href: "/courses", label: "Курсы" },
                  { href: "/assignments", label: "Задания" },
                  { href: "/favorites", label: "Избранное" },
                  { href: "/leaderboard", label: "Лидеры" },
                  ...(session.user.role === "ADMIN" ? [{ href: "/admin", label: "Админ-панель" }] : []),
                ]}
              >
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {session.user.name || session.user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {roleLabels[session.user.role] || session.user.role}
                    </p>
                  </div>
                  <Link href="/profile">
                    <Button variant="outline" className="w-full">
                      Открыть профиль
                    </Button>
                  </Link>
                </div>
              </MobileNavMenu>
              <NotificationsDropdown />
              <Link 
                href="/profile" 
                className="text-right hidden sm:block hover:opacity-80 transition-opacity cursor-pointer"
              >
                <p className="text-sm font-medium text-gray-900">
                  {session.user.name || session.user.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {roleLabels[session.user.role] || session.user.role}
                </p>
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      <Footer />
    </div>
  )
}
