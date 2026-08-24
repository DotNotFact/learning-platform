import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CertificateCard } from "@/components/CertificateCard"
import { EditProfileButton } from "@/components/EditProfileButton"
import { User, Mail, Calendar, Award, BookOpen, FileQuestion, GraduationCap, TrendingUp, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import Link from "next/link"
import { notFound } from "next/navigation"
import Image from "next/image"

const roleLabels: Record<string, string> = {
  STUDENT: "Студент",
  TEACHER: "Преподаватель",
  MODERATOR: "Модератор",
  MANAGER: "Менеджер",
  ADMIN: "Администратор",
}

const roleColors: Record<string, string> = {
  STUDENT: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  TEACHER: "bg-green-100 text-green-800 hover:bg-green-100",
  MODERATOR: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  MANAGER: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  ADMIN: "bg-red-100 text-red-800 hover:bg-red-100",
}

export default async function ProfilePage() {
  const session = await requireAuth()

  const user = await db.user.findUnique({
    where: { userUid: session.user.id },
    include: {
      courses: {
        select: {
          courseUid: true,
          title: true,
          isPublished: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      enrollments: {
        select: {
          enrollmentUid: true,
          courseUid: true,
          enrolledAt: true,
          completedAt: true,
          progress: true,
          course: {
            select: {
              courseUid: true,
              title: true,
              isPublished: true,
            },
          },
        },
        orderBy: {
          enrolledAt: "desc",
        },
      },
      quizAttempts: {
        select: {
          passed: true,
          percentage: true,
          completedAt: true,
          quiz: {
            select: {
              quizUid: true,
              courseUid: true,
              passingScore: true,
            },
          },
        },
        orderBy: {
          completedAt: "desc",
        },
      },
      certificates: {
        select: {
          certificateUid: true,
          courseUid: true,
          issuedAt: true,
          certificateUrl: true,
        },
        orderBy: {
          issuedAt: "desc",
        },
      },
      progress: {
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
        take: 10,
      },
    },
  })

  if (!user) {
    notFound()
  }

  const fullName = [user.lastName, user.firstName, user.middleName].filter(Boolean).join(" ")
  const displayName = user.name || fullName || "Без имени"
  const location = [user.city, user.country].filter(Boolean).join(", ")

  const uniqueEnrolledCourses = new Set<string>(
    user.enrollments.map((e: { course: { courseUid: string } }) => e.course.courseUid)
  )

  const enrolledCourseUids = Array.from(uniqueEnrolledCourses)
  const [lessonsCompleted, lessonsTotal, quizzesTotal] = await Promise.all([
    db.progress.count({ where: { userUid: user.userUid, completed: true } }),
    enrolledCourseUids.length > 0
      ? db.lesson.count({ where: { courseUid: { in: enrolledCourseUids } } })
      : 0,
    enrolledCourseUids.length > 0
      ? db.quiz.count({ where: { courseUid: { in: enrolledCourseUids } } })
      : 0,
  ])

  const completedCourses = user.enrollments.filter(
    (e: { completedAt: Date | null; progress: number }) => e.completedAt !== null || e.progress >= 100
  )
  const uniqueCompletedCourses = new Set<string>(
    completedCourses.map((e: { course: { courseUid: string } }) => e.course.courseUid)
  )

  const bestAttemptByQuiz = new Map<string, number>()
  const passedQuizUids = new Set<string>()

  user.quizAttempts.forEach((attempt: { quiz: { quizUid: string; passingScore: number | null } | null; percentage: number; passed: boolean }) => {
    const quizUid = attempt.quiz?.quizUid
    if (!quizUid) return
    const passingScore = attempt.quiz?.passingScore ?? 70
    const isPassed = attempt.passed || attempt.percentage >= passingScore
    if (isPassed) passedQuizUids.add(quizUid)
    const currentBest = bestAttemptByQuiz.get(quizUid) ?? 0
    if (attempt.percentage > currentBest) {
      bestAttemptByQuiz.set(quizUid, attempt.percentage)
    }
  })

  const averageQuizScore =
    bestAttemptByQuiz.size > 0
      ? Math.round(
          Array.from(bestAttemptByQuiz.values()).reduce((sum, value) => sum + value, 0) /
            bestAttemptByQuiz.size
        )
      : 0

  const stats = {
    coursesCreated: user.courses.length,
    coursesPublished: user.courses.filter((c: { isPublished: boolean }) => c.isPublished).length,
    coursesEnrolled: uniqueEnrolledCourses.size,
    coursesCompleted: uniqueCompletedCourses.size,
    quizzesPassed: passedQuizUids.size,
    quizzesTotal,
    certificates: user.certificates.length,
    lessonsCompleted,
    lessonsTotal,
    averageQuizScore,
  }

  const completionRate =
    stats.lessonsTotal > 0 ? Math.round((stats.lessonsCompleted / stats.lessonsTotal) * 100) : 0
  const quizSuccessRate =
    stats.quizzesTotal > 0 ? Math.round((stats.quizzesPassed / stats.quizzesTotal) * 100) : 0

  const normalizeLink = (value: string | null | undefined) => {
    if (!value) return null
    if (value.startsWith("http://") || value.startsWith("https://")) return value
    return `https://${value}`
  }

  const profileFields = [
    { label: "ФИО", value: fullName },
    { label: "Организация", value: user.organization },
    { label: "Должность", value: user.position },
    { label: "Предметы / специализация", value: user.subjects },
    { label: "Уровень/класс", value: user.gradeLevel },
    {
      label: "Опыт",
      value: user.experienceYears !== null && user.experienceYears !== undefined
        ? `${user.experienceYears} лет`
        : null,
    },
    { label: "Образование", value: user.education },
  ].filter((item) => item.value)

  const contactFields = [
    { label: "Телефон", value: user.phone },
    { label: "Город", value: location },
    { label: "Часовой пояс", value: user.timezone },
  ].filter((item) => item.value)

  const linkFields = [
    { label: "Сайт", value: normalizeLink(user.websiteUrl) },
    {
      label: "Telegram",
      value: user.telegram
        ? `https://t.me/${user.telegram.replace(/^@/, "")}`
        : null,
      display: user.telegram,
    },
    { label: "VK", value: normalizeLink(user.vk) },
    { label: "LinkedIn", value: normalizeLink(user.linkedin) },
  ].filter((item) => item.value)

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Профиль пользователя</h1>
        <p className="text-muted-foreground text-lg">Просмотр и управление информацией о вашем аккаунте</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-4">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={displayName}
                    width={96}
                    height={96}
                    className="h-24 w-24 rounded-full object-cover shrink-0 border-2"
                    unoptimized
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-12 w-12 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-2xl mb-2 wrap-break-word">{displayName}</CardTitle>
                  <Badge className={`${roleColors[user.role] || "bg-gray-100 text-gray-800"} w-fit`}>
                    {roleLabels[user.role] || user.role}
                  </Badge>
                  {user.isProfilePublic === false && (
                    <Badge variant="secondary" className="mt-2 w-fit">
                      Профиль скрыт
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <EditProfileButton
                user={{
                  name: user.name,
                  bio: user.bio,
                  avatarUrl: user.avatarUrl,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  middleName: user.middleName,
                  phone: user.phone,
                  city: user.city,
                  country: user.country,
                  timezone: user.timezone,
                  organization: user.organization,
                  position: user.position,
                  subjects: user.subjects,
                  gradeLevel: user.gradeLevel,
                  experienceYears: user.experienceYears,
                  education: user.education,
                  websiteUrl: user.websiteUrl,
                  telegram: user.telegram,
                  vk: user.vk,
                  linkedin: user.linkedin,
                  isProfilePublic: user.isProfilePublic,
                }}
              />
              <div className="flex items-start gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-muted-foreground block mb-1">Email:</span>
                  <span className="font-medium break-all">{user.email}</span>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-muted-foreground block mb-1">Регистрация:</span>
                  <span className="font-medium">
                    {format(new Date(user.createdAt), "d MMMM yyyy", { locale: ru })}
                  </span>
                </div>
              </div>
              {user.bio && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{user.bio}</p>
                </div>
              )}
              {user.isActive === false && (
                <div className="pt-4 border-t">
                  <Badge variant="destructive">Аккаунт неактивен</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg">Быстрые действия</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/courses">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Все курсы
                </Button>
              </Link>
              {session.user.role === "ADMIN" && (
                <Link href="/admin">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Award className="h-4 w-4 mr-2" />
                    Админ-панель
                  </Button>
                </Link>
              )}
              <Link href="/dashboard">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Дашборд
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {profileFields.length > 0 && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Профиль</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {profileFields.map((field) => (
                    <div key={field.label} className="space-y-1">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">{field.label}</div>
                      <div className="text-sm font-medium">{field.value}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(contactFields.length > 0 || linkFields.length > 0) && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Контакты и ссылки</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contactFields.length > 0 && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {contactFields.map((field) => (
                      <div key={field.label} className="space-y-1">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">{field.label}</div>
                        <div className="text-sm font-medium">{field.value}</div>
                      </div>
                    ))}
                  </div>
                )}
                {linkFields.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {linkFields.map((field) => (
                      <div key={field.label} className="space-y-1">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">{field.label}</div>
                        <a
                          href={field.value as string}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-primary hover:underline break-all"
                        >
                          {field.display || field.value}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Созданные курсы</CardTitle>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-1">{stats.coursesCreated}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.coursesPublished > 0 ? `${stats.coursesPublished} опубликовано` : "Нет опубликованных"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Записан на курсы</CardTitle>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-1">{stats.coursesEnrolled}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.coursesCompleted > 0 ? `${stats.coursesCompleted} завершено` : "В процессе обучения"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Завершено курсов</CardTitle>
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Award className="h-5 w-5 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-1">{stats.coursesCompleted}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.coursesCompleted === 0
                    ? "Начните завершать курсы"
                    : stats.coursesCompleted === 1
                    ? "курс завершен"
                    : "курсов завершено"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Пройдено тестов</CardTitle>
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <FileQuestion className="h-5 w-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-1">{stats.quizzesPassed}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.quizzesTotal > 0
                    ? `из ${stats.quizzesTotal} (${quizSuccessRate}% успешности)`
                    : "Нет пройденных тестов"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Средний балл</CardTitle>
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Award className="h-5 w-5 text-yellow-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-1">{stats.averageQuizScore}%</div>
                <p className="text-xs text-muted-foreground">
                  {stats.quizzesTotal > 0 ? "По всем тестам" : "Нет данных"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Сертификаты</CardTitle>
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-yellow-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-1">{stats.certificates}</div>
                <p className="text-xs text-muted-foreground">Получено сертификатов</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Завершено уроков</CardTitle>
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-1">{stats.lessonsCompleted}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.lessonsTotal > 0
                    ? `из ${stats.lessonsTotal} (${completionRate}% прогресса)`
                    : "Нет завершенных уроков"}
                </p>
              </CardContent>
            </Card>
          </div>

          {stats.coursesCreated > 0 && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Созданные курсы ({stats.coursesCreated})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {user.courses.map((course: { courseUid: string; title: string; isPublished: boolean; createdAt: Date }) => (
                    <Link
                      key={course.courseUid}
                      href={`/courses/${course.courseUid}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors group">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium block group-hover:text-primary transition-colors truncate">
                            {course.title}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(course.createdAt), "d MMM yyyy", { locale: ru })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge variant={course.isPublished ? "default" : "secondary"}>
                            {course.isPublished ? "Опубликован" : "Черновик"}
                          </Badge>
                          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {stats.coursesEnrolled > 0 && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Записи на курсы ({stats.coursesEnrolled})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.from(uniqueEnrolledCourses).map((courseUid) => {
                    const enrollment = user.enrollments.find(
                      (e: { course: { courseUid: string } }) => e.course.courseUid === courseUid
                    )
                    if (!enrollment) return null
                    const isCompleted =
                      (enrollment as { completedAt: Date | null; progress: number }).completedAt !== null ||
                      (enrollment as { completedAt: Date | null; progress: number }).progress >= 100
                    return (
                      <Link
                        key={enrollment.enrollmentUid}
                        href={`/courses/${enrollment.course.courseUid}`}
                        className="block"
                      >
                        <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors group">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium block group-hover:text-primary transition-colors truncate">
                              {enrollment.course.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Записан: {format(new Date(enrollment.enrolledAt), "d MMM yyyy", { locale: ru })}
                              {isCompleted && (
                                <span className="ml-2 text-emerald-600 font-medium">✓ Завершен</span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {isCompleted && (
                              <Badge variant="default" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                                Завершен
                              </Badge>
                            )}
                            {!enrollment.course.isPublished && (
                              <Badge variant="secondary" className="text-xs">Черновик</Badge>
                            )}
                            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {stats.certificates > 0 && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Мои сертификаты ({stats.certificates})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {await Promise.all(
                    user.certificates.map(async (cert: { certificateUid: string; courseUid: string; issuedAt: Date; certificateUrl: string | null }) => {
                      const course = await db.course.findUnique({
                        where: { courseUid: cert.courseUid },
                        select: {
                          title: true,
                          thumbnailUrl: true,
                          description: true,
                          author: {
                            select: {
                              name: true,
                            },
                          },
                        },
                      })

                      return (
                        <CertificateCard
                          key={cert.certificateUid}
                          certificateUid={cert.certificateUid}
                          courseUid={cert.courseUid}
                          courseTitle={course?.title || "Неизвестный курс"}
                          courseThumbnailUrl={course?.thumbnailUrl}
                          courseDescription={course?.description}
                          authorName={course?.author.name}
                          issuedAt={cert.issuedAt}
                          certificateUrl={cert.certificateUrl}
                        />
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* История обучения */}
          {user.progress.length > 0 && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  История обучения
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {user.progress
                    .filter((p: { completed: boolean }) => p.completed)
                    .slice(0, 10)
                    .map((p: { lesson: { lessonUid: string; title: string; course: { courseUid: string; title: string } }; completedAt: Date | null; lastWatchedAt: Date | null }) => (
                      <Link
                        key={p.lesson.lessonUid}
                        href={`/courses/${p.lesson.course.courseUid}`}
                        className="block"
                      >
                        <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors group">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium block group-hover:text-primary transition-colors truncate">
                              {p.lesson.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {p.lesson.course.title}
                            </span>
                            {p.completedAt && (
                              <span className="text-xs text-muted-foreground block mt-1">
                                Завершен: {format(new Date(p.completedAt), "d MMM yyyy", { locale: ru })}
                              </span>
                            )}
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-4" />
                        </div>
                      </Link>
                    ))}
                  {user.progress.filter((p: { completed: boolean }) => p.completed).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Пока нет завершенных уроков
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {stats.coursesCreated === 0 && stats.coursesEnrolled === 0 && stats.certificates === 0 && (
            <Card className="border-2">
              <CardContent className="py-12 text-center">
                <div className="mb-4 text-6xl">📚</div>
                <h3 className="text-xl font-semibold mb-2">Начните обучение</h3>
                <p className="text-muted-foreground mb-6">
                  Запишитесь на курс, чтобы начать свой путь к знаниям
                </p>
                <Link href="/courses">
                  <Button size="lg">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Перейти к курсам
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
