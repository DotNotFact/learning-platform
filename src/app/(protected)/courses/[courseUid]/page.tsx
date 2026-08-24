import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { QuizComponent } from "@/components/courses/QuizComponent"
import { CommentsSection } from "@/components/courses/CommentsSection"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BackButton } from "@/components/BackButton"
import { EnrollCourseButton } from "@/components/courses/EnrollCourseButton"
import { Progress } from "@/components/ui/progress"
import { FavoriteButton } from "@/components/courses/FavoriteButton"
import { CourseRatingWidget } from "@/components/courses/CourseRatingWidget"
import Link from "next/link"
import { Play, FileQuestion, BookOpen, Award, User, CheckCircle2, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { canEditCourse } from "@/lib/rbac"
import type { UserRole } from "@/types"

interface CoursePageProps {
  params:
    | Promise<{
        courseUid: string
      }>
    | {
        courseUid: string
      }
  searchParams?: Promise<{ returnTo?: string }> | { returnTo?: string }
}

export default async function CoursePage({ params, searchParams }: CoursePageProps) {
  const session = await requireAuth()

  const resolvedParams = await Promise.resolve(params)
  const resolvedSearchParams = await Promise.resolve(searchParams || {})
  const isAdmin = session.user.role === "ADMIN"
  const userUid = session.user.id
  
  // Определяем путь возврата (будет переопределен на клиенте через BackButton)
  const returnTo = resolvedSearchParams.returnTo || "/courses"
  
  const course = await db.course.findUnique({
    where: {
      courseUid: resolvedParams.courseUid,
      ...(isAdmin ? {} : { isPublished: true }),
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

  const canEdit = canEditCourse(session.user.role as UserRole, course.authorUid, userUid)
  const lessons = course.lessons
  const totalVideos = lessons.filter((l: { videoUrl: string | null }) => !!l.videoUrl).length
  const totalQuizzes = course.quizzes.length
  const totalQuestions = course.quizzes.reduce((acc: number, quiz: { questions: unknown[] }) => acc + quiz.questions.length, 0)

  const enrollment = await db.enrollment.findUnique({
    where: { userUid_courseUid: { userUid, courseUid: resolvedParams.courseUid } },
  })

  const favorite = await db.courseFavorite.findUnique({
    where: { userUid_courseUid: { userUid, courseUid: resolvedParams.courseUid } },
    select: { userUid: true },
  })

  const progressRows: Array<{ lessonUid: string; completed: boolean }> = await db.progress.findMany({
    where: {
      userUid,
      lessonUid: { in: lessons.map((l: { lessonUid: string }) => l.lessonUid) },
    },
    select: { lessonUid: true, completed: true },
  })
  const progressMap = new Map<string, { lessonUid: string; completed: boolean }>(
    progressRows.map((p) => [p.lessonUid, p])
  )
  const completedLessons = progressRows.filter((p) => p.completed).length
  const courseProgress = enrollment
    ? enrollment.progress
    : lessons.length > 0
      ? (completedLessons / lessons.length) * 100
      : 0

  const isPaidCourse = (course.price ?? 0) > 0
  const canAccessQuizzes =
    canEdit || !!enrollment || !isPaidCourse

  const firstIncomplete = lessons.find((l: { lessonUid: string }) => !progressMap.get(l.lessonUid)?.completed)
  const continueLessonUid = (firstIncomplete?.lessonUid || lessons[0]?.lessonUid) ?? null

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <BackButton defaultPath={returnTo} />
      </div>

      {/* Заголовок курса */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h1 className="text-4xl font-bold tracking-tight">{course.title}</h1>
          <FavoriteButton courseUid={course.courseUid} initialIsFavorited={Boolean(favorite)} size="sm" />
          {!course.isPublished && isAdmin && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
              Черновик
            </Badge>
          )}
        </div>
        {course.description && (
          <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mb-6">
            {course.description}
          </p>
        )}
        
        {/* Статистика курса */}
        <div className="flex flex-wrap items-center gap-6 mb-6">
          {course.author.name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="font-medium">Автор:</span>
              <span>{course.author.name}</span>
            </div>
          )}
          {totalVideos > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Play className="h-4 w-4" />
              <span>{totalVideos} {totalVideos === 1 ? 'видео' : totalVideos < 5 ? 'видео' : 'видео'}</span>
            </div>
          )}
          {totalQuizzes > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileQuestion className="h-4 w-4" />
              <span>{totalQuizzes} {totalQuizzes === 1 ? 'тест' : totalQuizzes < 5 ? 'теста' : 'тестов'}</span>
            </div>
          )}
          {totalQuestions > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span>{totalQuestions} {totalQuestions === 1 ? 'вопрос' : totalQuestions < 5 ? 'вопроса' : 'вопросов'}</span>
            </div>
          )}
        </div>

        {/* Запись/прогресс */}
        <div className="flex flex-wrap items-center gap-4">
          {!enrollment ? (
            <EnrollCourseButton
              courseUid={resolvedParams.courseUid}
              price={course.price}
              courseTitle={course.title}
            />
          ) : (
            <>
              <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[240px]">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Прогресс курса</span>
                  <span className="font-semibold">{Math.round(courseProgress)}%</span>
                </div>
                <Progress value={courseProgress} className="h-2" />
              </div>
              {continueLessonUid && (
                <Link href={`/courses/${resolvedParams.courseUid}/lessons/${continueLessonUid}`}>
                  <Badge className="cursor-pointer hover:opacity-90">
                    Продолжить <ArrowRight className="h-3 w-3 ml-1" />
                  </Badge>
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mb-8">
        <CourseRatingWidget courseUid={course.courseUid} />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-10">
          {lessons.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Play className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-3xl font-bold">Уроки</h2>
                <Badge variant="secondary" className="ml-auto">
                  {lessons.length}
                </Badge>
              </div>

              {!enrollment && (
                <Card className="border-2">
                  <CardContent className="py-6">
                    <p className="text-muted-foreground">
                      {isPaidCourse
                        ? "Купите доступ, чтобы открыть все уроки (бесплатные доступны сразу)."
                        : "Запишитесь на курс, чтобы открыть все уроки (бесплатные доступны сразу)."}
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {lessons.map((lesson, index) => {
                  const done = !!progressMap.get(lesson.lessonUid)?.completed
                  const locked = !lesson.isFree && !enrollment && !isAdmin
                  return (
                    <Link
                      key={lesson.lessonUid}
                      href={locked ? "#" : `/courses/${resolvedParams.courseUid}/lessons/${lesson.lessonUid}`}
                      className={locked ? "pointer-events-none opacity-60" : ""}
                    >
                      <div className="flex items-center gap-3 p-4 rounded-lg border hover:shadow-xs transition-all">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{lesson.title}</div>
                          {lesson.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {lesson.description}
                            </div>
                          )}
                        </div>
                        {lesson.isFree && <Badge variant="secondary">free</Badge>}
                        {done && (
                          <Badge className="bg-green-500 hover:bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Готово
                          </Badge>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {course.quizzes.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileQuestion className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-3xl font-bold">Тесты</h2>
                <Badge variant="secondary" className="ml-auto">
                  {totalQuizzes}
                </Badge>
              </div>
              {!canAccessQuizzes ? (
                <Card className="border-2">
                  <CardContent className="py-6">
                    <p className="text-muted-foreground">
                      {isPaidCourse
                        ? "Купите доступ, чтобы открыть тесты. Для бесплатных курсов тесты доступны сразу."
                        : "Запишитесь на курс, чтобы открыть тесты. Для бесплатных курсов тесты доступны сразу."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {course.quizzes.map((quiz: { quizUid: string; title: string; description: string | null; questions: Array<{ questionUid: string; text: string; options: string; correctOptions: string; explanation: string | null }> }, index: number) => (
                    <div key={quiz.quizUid} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {index + 1}
                        </div>
                        <h3 className="font-semibold text-lg">{quiz.title}</h3>
                        {quiz.questions.length > 0 && (
                          <Badge variant="outline" className="ml-auto">
                            {quiz.questions.length} {quiz.questions.length === 1 ? 'вопрос' : quiz.questions.length < 5 ? 'вопроса' : 'вопросов'}
                          </Badge>
                        )}
                      </div>
                      <QuizComponent
                        quizUid={quiz.quizUid}
                        title={quiz.title}
                        description={quiz.description}
                        questions={quiz.questions.map((q: { questionUid: string; text: string; options: string; correctOptions: string; explanation: string | null }) => ({
                          questionUid: q.questionUid,
                          text: q.text,
                          options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options as Array<{ optionUid: string; text: string }>,
                          correctOptions: typeof q.correctOptions === 'string' ? JSON.parse(q.correctOptions) : q.correctOptions as string[],
                          explanation: q.explanation,
                        }))}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {lessons.length === 0 && course.quizzes.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground text-lg">
                  В этом курсе пока нет контента
                </p>
              </CardContent>
            </Card>
          )}

          {/* Комментарии */}
          <CommentsSection courseUid={resolvedParams.courseUid} />
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-4">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Содержание курса
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lessons.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
                      <Play className="h-4 w-4" />
                      Уроки ({lessons.length})
                    </h3>
                    <ul className="space-y-2">
                      {lessons.map((lesson, index) => (
                        <li key={lesson.lessonUid} className="flex items-start gap-2 p-2 rounded-md hover:bg-accent transition-colors">
                          <span className="text-xs font-semibold text-muted-foreground mt-0.5 min-w-[20px]">
                            {index + 1}.
                          </span>
                          <span className="text-sm leading-relaxed">{lesson.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {course.quizzes.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
                      <FileQuestion className="h-4 w-4" />
                      Тесты ({course.quizzes.length})
                    </h3>
                    <ul className="space-y-2">
                      {course.quizzes.map((quiz: { quizUid: string; title: string }, index: number) => (
                        <li key={quiz.quizUid} className="flex items-start gap-2 p-2 rounded-md hover:bg-accent transition-colors">
                          <span className="text-xs font-semibold text-muted-foreground mt-0.5 min-w-[20px]">
                            {index + 1}.
                          </span>
                          <span className="text-sm leading-relaxed">{quiz.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {lessons.length === 0 && course.quizzes.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Контент будет добавлен позже
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Статистика курса */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Статистика
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Видео уроков</span>
                  <span className="font-semibold">{totalVideos}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Уроков</span>
                  <span className="font-semibold">{lessons.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Тестов</span>
                  <span className="font-semibold">{totalQuizzes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Вопросов</span>
                  <span className="font-semibold">{totalQuestions}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
