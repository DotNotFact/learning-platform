import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CourseCard } from "@/components/courses/CourseCard"
import { MyCourseCard } from "@/components/courses/MyCourseCard"
import {
  BookOpen,
  Users,
  Award,
  Play,
  Clock,
  TrendingUp,
  Plus,
  FileQuestion,
  CheckCircle2,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale/ru"

export default async function DashboardPage() {
  const session = await requireAuth()
  const userUid = session.user.id

  // Получаем все опубликованные курсы
  const allCourses = await db.course.findMany({
    where: {
      isPublished: true,
    },
    include: {
      author: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  // Получаем записи пользователя на курсы
  const enrollments = await db.enrollment.findMany({
    where: {
      userUid,
    },
    include: {
      course: {
        include: {
          author: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      enrolledAt: "desc",
    },
  })

  // Получаем статистику прогресса
  const completedLessons = await db.progress.count({
    where: {
      userUid,
      completed: true,
    },
  })

  // Получаем последние активности
  const recentProgress = await db.progress.findMany({
    where: {
      userUid,
    },
    include: {
      lesson: {
        select: {
          lessonUid: true,
          title: true,
          courseUid: true,
          course: {
            select: {
              courseUid: true,
              title: true,
            },
          },
        },
      },
    },
    orderBy: {
      lastWatchedAt: "desc",
    },
    take: 5,
  })

  const recentQuizAttempts = await db.quizAttempt.findMany({
    where: {
      userUid,
    },
    include: {
      quiz: {
        select: {
          quizUid: true,
          title: true,
          courseUid: true,
          passingScore: true,
          course: {
            select: {
              courseUid: true,
              title: true,
            },
          },
        },
      },
    },
    orderBy: {
      completedAt: "desc",
    },
    take: 5,
  })

  const quizAttempts = await db.quizAttempt.findMany({
    where: { userUid },
    select: {
      quizUid: true,
      percentage: true,
      passed: true,
      quiz: {
        select: {
          quizUid: true,
          passingScore: true,
          courseUid: true,
        },
      },
    },
  })

  // Статистика
  const enrolledCourseUids = new Set(enrollments.map((e) => e.courseUid))
  const completedCourses = enrollments.filter(
    (e) => e.completedAt !== null || e.progress >= 100
  )

  const enrolledCourseUidList = Array.from(enrolledCourseUids)
  const [totalLessons, totalQuizzes] = await Promise.all([
    enrolledCourseUidList.length > 0
      ? db.lesson.count({
          where: {
            courseUid: { in: enrolledCourseUidList },
          },
        })
      : 0,
    enrolledCourseUidList.length > 0
      ? db.quiz.count({
          where: {
            courseUid: { in: enrolledCourseUidList },
          },
        })
      : 0,
  ])

  const passedQuizUids = new Set<string>()
  quizAttempts.forEach((attempt) => {
    const quizUid = attempt.quiz?.quizUid
    if (!quizUid) return
    const passingScore = attempt.quiz?.passingScore ?? 70
    if (attempt.passed || attempt.percentage >= passingScore) {
      passedQuizUids.add(quizUid)
    }
  })

  const stats = {
    totalCourses: allCourses.length,
    coursesEnrolled: enrollments.length,
    coursesCompleted: completedCourses.length,
    completedQuizzes: passedQuizUids.size,
    completedLessons,
    totalLessons,
    totalQuizzes,
  }

  // Мои курсы (последние 6)
  const myCourses = enrollments.slice(0, 6).map((enrollment) => ({
    courseUid: enrollment.course.courseUid,
    title: enrollment.course.title,
    description: enrollment.course.description,
    thumbnailUrl: enrollment.course.thumbnailUrl,
    authorName: enrollment.course.author.name,
    progress: enrollment.progress,
    enrolledAt: enrollment.enrolledAt,
    completedAt: enrollment.completedAt,
  }))

  // Рекомендуемые курсы (не записанные, последние 6)
  const recommendedCourses = allCourses
    .filter((course) => !enrolledCourseUids.has(course.courseUid))
    .slice(0, 6)

  // Последняя активность (объединяем прогресс и тесты)
  const recentActivity = [
    ...recentProgress.map((p) => ({
      type: "lesson" as const,
      title: p.lesson.title,
      courseTitle: p.lesson.course.title,
      courseUid: p.lesson.courseUid,
      date: p.lastWatchedAt || p.completedAt,
      completed: p.completed,
    })),
    ...recentQuizAttempts.map((qa) => ({
      type: "quiz" as const,
      title: qa.quiz.title,
      courseTitle: qa.quiz.course.title,
      courseUid: qa.quiz.courseUid,
      date: qa.completedAt,
      completed: qa.passed || qa.percentage >= (qa.quiz.passingScore ?? 70),
    })),
  ]
    .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0))
    .slice(0, 5)

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Заголовок */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          Добро пожаловать, {session.user.name || session.user.email}!
        </h1>
        <p className="text-lg text-muted-foreground">
          Продолжайте обучение или начните новый курс для расширения своих знаний
        </p>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-10">
        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Мои курсы
            </CardTitle>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">{stats.coursesEnrolled}</div>
            <p className="text-xs text-muted-foreground">
              {stats.coursesCompleted > 0
                ? `${stats.coursesCompleted} завершено`
                : stats.coursesEnrolled === 0
                ? "Запишитесь на курс"
                : "В процессе обучения"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Пройдено уроков
            </CardTitle>
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Play className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">{stats.completedLessons}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalLessons > 0
                ? `из ${stats.totalLessons} доступных`
                : "Начните обучение"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Пройдено тестов
            </CardTitle>
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <FileQuestion className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">{stats.completedQuizzes}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalQuizzes > 0
                ? `из ${stats.totalQuizzes} тестов`
                : "Начните проходить тесты"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Завершено курсов
            </CardTitle>
            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Award className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">{stats.coursesCompleted}</div>
            <p className="text-xs text-muted-foreground">
              {stats.coursesCompleted === 0
                ? "Продолжайте обучение"
                : stats.coursesCompleted === 1
                ? "курс завершен"
                : "курсов завершено"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Быстрые действия */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Быстрые действия</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/courses">
            <Card className="border-2 hover:shadow-lg transition-all cursor-pointer h-full">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">Все курсы</h3>
                <p className="text-sm text-muted-foreground">Просмотреть каталог</p>
              </CardContent>
            </Card>
          </Link>

          {session.user.role === "TEACHER" || session.user.role === "MODERATOR" || session.user.role === "ADMIN" ? (
            <Link href="/admin">
              <Card className="border-2 hover:shadow-lg transition-all cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                    <Plus className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-1">Создать курс</h3>
                  <p className="text-sm text-muted-foreground">Добавить новый курс</p>
                </CardContent>
              </Card>
            </Link>
          ) : null}

          <Link href="/profile">
            <Card className="border-2 hover:shadow-lg transition-all cursor-pointer h-full">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-1">Профиль</h3>
                <p className="text-sm text-muted-foreground">Настройки аккаунта</p>
              </CardContent>
            </Card>
          </Link>

          {session.user.role === "ADMIN" && (
            <Link href="/admin">
              <Card className="border-2 hover:shadow-lg transition-all cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-1">Админ-панель</h3>
                  <p className="text-sm text-muted-foreground">Управление системой</p>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Основной контент */}
        <div className="lg:col-span-2 space-y-10">
          {/* Мои курсы */}
          {myCourses.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight mb-2">Мои курсы</h2>
                  <p className="text-muted-foreground">
                    Продолжайте обучение на курсах, на которые вы записаны
                  </p>
                </div>
                {enrollments.length > 6 && (
                  <Link href="/courses?my=true">
                    <Button variant="outline" size="lg">
                      Все мои курсы →
                    </Button>
                  </Link>
                )}
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {myCourses.map((course) => (
                  <MyCourseCard key={course.courseUid} {...course} />
                ))}
              </div>
            </section>
          )}

          {/* Рекомендуемые курсы */}
          {recommendedCourses.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
                    <TrendingUp className="h-8 w-8 text-primary" />
                    Рекомендуемые курсы
                  </h2>
                  <p className="text-muted-foreground">
                    Новые курсы, которые могут вас заинтересовать
                  </p>
                </div>
                <Link href="/courses">
                  <Button variant="outline" size="lg">
                    Все курсы →
                  </Button>
                </Link>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {recommendedCourses.map((course) => (
                  <CourseCard
                    key={course.courseUid}
                    courseUid={course.courseUid}
                    title={course.title}
                    description={course.description}
                    thumbnailUrl={course.thumbnailUrl}
                    authorName={course.author.name}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Пустое состояние */}
          {myCourses.length === 0 && recommendedCourses.length === 0 && (
            <Card className="border-2">
              <CardContent className="py-16 text-center">
                <div className="mb-4 text-6xl">📚</div>
                <h3 className="text-xl font-semibold mb-2">Начните обучение</h3>
                <p className="text-muted-foreground mb-6">
                  Запишитесь на курс, чтобы начать свое обучение
                </p>
                <Link href="/courses">
                  <Button size="lg">Посмотреть курсы</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Боковая панель */}
        <div className="lg:col-span-1 space-y-6">
          {/* Последняя активность */}
          {recentActivity.length > 0 && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Последняя активность
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    <div className="shrink-0 mt-1">
                      {activity.type === "lesson" ? (
                        <Play className="h-4 w-4 text-blue-600" />
                      ) : (
                        <FileQuestion className="h-4 w-4 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/courses/${activity.courseUid}`}
                        className="text-sm font-medium hover:text-primary transition-colors"
                      >
                        {activity.title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.courseTitle}
                      </p>
                      {activity.date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(activity.date, {
                            addSuffix: true,
                            locale: ru,
                          })}
                        </p>
                      )}
                    </div>
                    {activity.completed && (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-1" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Статистика обучения */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Статистика
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Курсов записано</span>
                <span className="font-semibold">{stats.coursesEnrolled}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Курсов завершено</span>
                <span className="font-semibold">{stats.coursesCompleted}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Уроков пройдено</span>
                <span className="font-semibold">
                  {stats.completedLessons}
                  {stats.totalLessons > 0 && ` / ${stats.totalLessons}`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Тестов пройдено</span>
                <span className="font-semibold">
                  {stats.completedQuizzes}
                  {stats.totalQuizzes > 0 && ` / ${stats.totalQuizzes}`}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
