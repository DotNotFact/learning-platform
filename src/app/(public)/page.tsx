import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CourseCard } from "@/components/courses/CourseCard"
import {
  ArrowRight,
  BookOpen,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react"

const difficultyLabels: Record<string, string> = {
  BEGINNER: "Начальный",
  INTERMEDIATE: "Средний",
  ADVANCED: "Продвинутый",
}

export default async function PublicHomePage() {
  const session = await auth()

  const [
    courses,
    coursesCount,
    lessonsCount,
    quizzesCount,
    usersCount,
    difficultyGroups,
  ] = await Promise.all([
    db.course.findMany({
      where: { isPublished: true },
      include: {
        author: { select: { name: true } },
        category: { select: { name: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    db.course.count({ where: { isPublished: true } }),
    db.lesson.count({ where: { course: { isPublished: true } } }),
    db.quiz.count({ where: { course: { isPublished: true } } }),
    db.user.count({ where: { isActive: true } }),
    db.course.groupBy({
      by: ["difficulty"],
      where: { isPublished: true },
      _count: { _all: true },
    }),
  ])

  const freeCourses = courses.filter((course) => (course.price ?? 0) <= 0)
  const weeklyCourses = courses.filter(
    (course) => (course.estimatedHours ?? 0) > 0 && (course.estimatedHours ?? 0) <= 8
  )
  const monthlyCourses = courses.filter((course) => (course.estimatedHours ?? 0) >= 20)

  const fallbackCourses = courses.slice(0, 3)
  const weeklyPick = (weeklyCourses.length > 0 ? weeklyCourses : fallbackCourses).slice(0, 3)
  const monthlyPick = (monthlyCourses.length > 0 ? monthlyCourses : fallbackCourses).slice(0, 3)
  const freePick = (freeCourses.length > 0 ? freeCourses : fallbackCourses).slice(0, 3)

  return (
    <div className="container mx-auto px-4 py-10 sm:py-12 space-y-12 sm:space-y-16">
      <section className="grid gap-8 sm:gap-10 lg:grid-cols-[1.2fr_0.8fr] items-center">
        <div className="space-y-6">
          <Badge className="w-fit" variant="secondary">
            <Sparkles className="h-3 w-3 mr-2" />
            Обучение без лишней воды
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
            Осваивайте навыки, проходите тесты и фиксируйте прогресс в одном месте
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
            Каталог курсов с уровнями, фильтрами и честной статистикой. Бесплатные тесты
            доступны сразу, платные - после авторизации.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/catalog">
              <Button size="lg">
                Перейти в каталог
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href={session ? "/dashboard" : "/register"}>
              <Button size="lg" variant="outline">
                {session ? "Открыть кабинет" : "Создать аккаунт"}
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" /> {usersCount}+ пользователей
            </span>
            <span className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> {coursesCount}+ курсов
            </span>
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4" /> {quizzesCount}+ тестов
            </span>
          </div>
        </div>
        <div className="bg-linear-to-br from-primary/10 via-white to-primary/5 border rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Что внутри платформы</h2>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                Прогресс по урокам и тестам, обновляется автоматически.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                Лидерборд и достижения для мотивации команды.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                Фильтры по уровню, цене и тематике курсов.
              </li>
            </ul>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-white border p-4">
                <p className="text-xs text-muted-foreground">Всего уроков</p>
                <p className="text-2xl font-bold">{lessonsCount}</p>
              </div>
              <div className="rounded-2xl bg-white border p-4">
                <p className="text-xs text-muted-foreground">Тестов доступно</p>
                <p className="text-2xl font-bold">{quizzesCount}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">Подборки</h2>
            <p className="text-muted-foreground">Курсы по длительности и цене</p>
          </div>
          <Link href="/catalog" className="text-sm text-primary hover:underline">
            Смотреть все →
          </Link>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {[{ title: "На неделю", items: weeklyPick }, { title: "На месяц", items: monthlyPick }, { title: "Бесплатные", items: freePick }].map((block) => (
            <div key={block.title} className="rounded-2xl border bg-white p-4 sm:p-5 space-y-4">
              <h3 className="text-xl font-semibold">{block.title}</h3>
              <div className="space-y-3">
                {block.items.map((course) => (
                  <Link
                    key={course.courseUid}
                    href={`/catalog/${course.courseUid}`}
                    className="block rounded-xl border p-3 hover:border-primary/40 hover:shadow-xs transition-all"
                  >
                    <p className="font-medium wrap-break-word">{course.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {course.description || "Описание курса скоро появится."}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {course.category?.name && (
                        <Badge variant="secondary">{course.category.name}</Badge>
                      )}
                      {course.difficulty && (
                        <Badge variant="outline">
                          {difficultyLabels[course.difficulty] || course.difficulty}
                        </Badge>
                      )}
                      {typeof course.price === "number" && (
                        <Badge>{course.price <= 0 ? "Бесплатно" : `${course.price} ₽`}</Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">Новые курсы</h2>
            <p className="text-muted-foreground">Самые свежие программы из каталога</p>
          </div>
        </div>
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          {courses.slice(0, 6).map((course) => (
            <CourseCard
              key={course.courseUid}
              courseUid={course.courseUid}
              title={course.title}
              description={course.description}
              thumbnailUrl={course.thumbnailUrl}
              authorName={course.author?.name}
              categoryName={course.category?.name}
              difficulty={course.difficulty}
              price={course.price}
              tags={course.tags?.map((t) => t.tag)}
              href={`/catalog/${course.courseUid}`}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {difficultyGroups.map((group) => (
          <div key={group.difficulty ?? "unknown"} className="rounded-2xl border bg-white p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Уровень</p>
                <p className="text-xl font-semibold">
                  {group.difficulty ? difficultyLabels[group.difficulty] || group.difficulty : "Без уровня"}
                </p>
              </div>
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {group._count._all} курсов в этом уровне
            </p>
          </div>
        ))}
      </section>
    </div>
  )
}
