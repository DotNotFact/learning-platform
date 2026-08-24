import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { canEditCourse } from "@/lib/rbac"
import { notFound } from "next/navigation"
import Link from "next/link"
import { QuizComponent } from "@/components/courses/QuizComponent"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EnrollCourseButton } from "@/components/courses/EnrollCourseButton"
import { ArrowLeft, BookOpen, FileQuestion, Play, User } from "lucide-react"
import type { UserRole } from "@/types"

interface CoursePageProps {
  params:
    | Promise<{
        courseUid: string
      }>
    | {
        courseUid: string
      }
}

const difficultyLabels: Record<string, string> = {
  BEGINNER: "Начальный",
  INTERMEDIATE: "Средний",
  ADVANCED: "Продвинутый",
}

export default async function PublicCoursePage({ params }: CoursePageProps) {
  const session = await auth()
  const resolvedParams = await Promise.resolve(params)

  const course = await db.course.findUnique({
    where: {
      courseUid: resolvedParams.courseUid,
      isPublished: true,
    },
    include: {
      author: {
        select: {
          name: true,
        },
      },
      lessons: {
        orderBy: {
          orderIndex: "asc",
        },
      },
      quizzes: {
        include: {
          questions: {
            orderBy: {
              orderIndex: "asc",
            },
          },
        },
      },
    },
  })

  if (!course) {
    notFound()
  }

  const isFreeCourse = (course.price ?? 0) <= 0
  const enrollment = session
    ? await db.enrollment.findUnique({
        where: {
          userUid_courseUid: {
            userUid: session.user.id,
            courseUid: course.courseUid,
          },
        },
        select: { enrollmentUid: true },
      })
    : null
  const canEdit = session
    ? canEditCourse(session.user.role as UserRole, course.authorUid, session.user.id)
    : false
  const canAccessQuizzes = isFreeCourse || Boolean(enrollment) || canEdit
  const totalVideos = course.lessons.filter((l) => !!l.videoUrl).length
  const totalQuizzes = course.quizzes.length
  const totalQuestions = course.quizzes.reduce((acc, quiz) => acc + quiz.questions.length, 0)

  return (
    <div className="container mx-auto px-4 py-8 sm:py-10 space-y-8 sm:space-y-10">
      <Link href="/catalog" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Назад в каталог
      </Link>

      <div className="grid gap-6 sm:gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl sm:text-4xl font-bold wrap-break-word">{course.title}</h1>
              {course.difficulty && (
                <Badge variant="outline">
                  {difficultyLabels[course.difficulty] || course.difficulty}
                </Badge>
              )}
              {typeof course.price === "number" && (
                <Badge>{course.price <= 0 ? "Бесплатно" : `${course.price} ₽`}</Badge>
              )}
            </div>
            {course.description && (
              <p className="text-muted-foreground text-base sm:text-lg wrap-break-word">{course.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {course.author?.name || "Автор"}
              </span>
              <span className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                {totalVideos} видео
              </span>
              <span className="flex items-center gap-2">
                <FileQuestion className="h-4 w-4" />
                {totalQuizzes} тестов
              </span>
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {totalQuestions} вопросов
              </span>
            </div>
          </div>

          {course.lessons.length > 0 && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Уроки
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {course.lessons.map((lesson, index) => (
                  <div
                    key={lesson.lessonUid}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{index + 1}. {lesson.title}</p>
                      {lesson.description && (
                        <p className="text-xs text-muted-foreground">{lesson.description}</p>
                      )}
                    </div>
                    <Badge variant={lesson.isFree ? "secondary" : "outline"}>
                      {lesson.isFree ? "free" : "только по подписке"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {course.quizzes.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileQuestion className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold">Тесты</h2>
              </div>

              {!canAccessQuizzes ? (
                <Card className="border-2">
                  <CardContent className="py-4 sm:py-6 space-y-3">
                    <p className="text-muted-foreground">
                      {session
                        ? "Это платный курс. Купите доступ, чтобы открыть тесты."
                        : "Это платный курс. Авторизуйтесь, чтобы купить доступ и открыть тесты."}
                    </p>
                    {!session && (
                      <Link href="/login">
                        <Button>Войти для доступа</Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {course.quizzes.map((quiz, index) => (
                    <div key={quiz.quizUid} className="border rounded-lg p-4 sm:p-6">
                      <div className="flex items-center gap-3 mb-3 sm:mb-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {index + 1}
                        </div>
                        <h3 className="font-semibold text-lg">{quiz.title}</h3>
                        {quiz.questions.length > 0 && (
                          <Badge variant="outline" className="ml-auto">
                            {quiz.questions.length} вопросов
                          </Badge>
                        )}
                      </div>
                      <QuizComponent
                        quizUid={quiz.quizUid}
                        title={quiz.title}
                        description={quiz.description}
                        questions={quiz.questions.map((q) => ({
                          questionUid: q.questionUid,
                          text: q.text,
                          options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
                          correctOptions: typeof q.correctOptions === "string"
                            ? JSON.parse(q.correctOptions)
                            : q.correctOptions,
                          explanation: q.explanation,
                        }))}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        <div className="space-y-4">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Доступ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {isFreeCourse
                  ? "Курс бесплатный: можно смотреть и проходить тесты сразу."
                  : "Курс платный: для доступа нужна авторизация и покупка (тестовая)."}
              </p>
              {session ? (
                <>
                  <Link href={`/courses/${course.courseUid}`}>
                    <Button className="w-full">Перейти к курсу</Button>
                  </Link>
                  {!enrollment && (
                    <EnrollCourseButton
                      courseUid={course.courseUid}
                      price={course.price}
                      courseTitle={course.title}
                    />
                  )}
                </>
              ) : (
                <Link href="/login">
                  <Button className="w-full">Войти и записаться</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
