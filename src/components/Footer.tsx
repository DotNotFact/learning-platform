import Link from "next/link"
import { Heart, Mail, Sparkles } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t bg-white/80 backdrop-blur-xs">
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-lg font-bold">
              <Sparkles className="h-5 w-5 text-primary" />
              <span>Платформа обучения</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Современные курсы, практические задания и честная статистика прогресса.
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold">Навигация</p>
            <div className="flex flex-col gap-1">
              <Link href="/catalog" className="text-muted-foreground hover:text-primary">
                Каталог курсов
              </Link>
              <Link href="/dashboard" className="text-muted-foreground hover:text-primary">
                Кабинет
              </Link>
              <Link href="/leaderboard" className="text-muted-foreground hover:text-primary">
                Таблица лидеров
              </Link>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold">Поддержка</p>
            <div className="flex flex-col gap-1">
              <Link href="/login" className="text-muted-foreground hover:text-primary">
                Войти
              </Link>
              <Link href="/register" className="text-muted-foreground hover:text-primary">
                Регистрация
              </Link>
              <Link href="/donate" className="text-muted-foreground hover:text-primary">
                Поддержать проект
              </Link>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <p className="font-semibold">Связаться</p>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>support@learning.local</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="h-4 w-4 text-rose-500" />
              <span>Спасибо за ваш вклад</span>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t pt-6 text-xs text-muted-foreground flex flex-wrap justify-between gap-3">
          <span>© 2026 Платформа обучения. Все права защищены.</span>
          <span>Сделано для обучения и прогресса</span>
        </div>
      </div>
    </footer>
  )
}
