import { ShieldCheck, Sparkles } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DonateTiers } from "@/components/donations/DonateTiers"

const tiers = [
  {
    title: "Кофе",
    amount: 199,
    description: "Помогает поддерживать серверы и базовые расходы.",
  },
  {
    title: "Поддержка",
    amount: 499,
    description: "Финансирует новые курсы и улучшение платформы.",
  },
  {
    title: "Партнер",
    amount: 990,
    description: "Развитие аналитики, таблиц лидеров и новых функций.",
  },
]

export default function DonatePage() {
  return (
    <div className="container mx-auto px-4 py-10 sm:py-12 space-y-6 sm:space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wide">Донат</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold">Поддержите развитие платформы</h1>
        <p className="text-muted-foreground text-base sm:text-lg max-w-2xl">
          Любой вклад помогает нам улучшать курсы, поддерживать инфраструктуру и развивать
          сообщество студентов.
        </p>
        <p className="text-sm text-muted-foreground">
          Сейчас включен тестовый режим - платежи не списываются, кнопки имитируют успешный донат.
        </p>
      </div>

      <DonateTiers tiers={tiers} />

      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Прозрачность
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Мы публикуем отчеты о расходовании средств внутри команды.</p>
          <p>Хотите поддержать иначе? Напишите в поддержку.</p>
          <Link href="/catalog" className="text-primary hover:underline">
            Вернуться в каталог
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
