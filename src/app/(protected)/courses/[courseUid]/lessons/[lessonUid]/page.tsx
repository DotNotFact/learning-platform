import Link from "next/link"
import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { canEditCourse, hasRole, ROLES } from "@/lib/rbac"
import type { UserRole } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { VideoPlayer } from "@/components/courses/VideoPlayer"
import { CompleteLessonButton } from "@/components/courses/CompleteLessonButton"
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, Play } from "lucide-react"

interface PageProps {
  params:
    | Promise<{ courseUid: string; lessonUid: string }>
    | { courseUid: string; lessonUid: string }
}

export default async function LessonPage({ params }: PageProps) {
  const session = await requireAuth()
  const userUid = session.user.id
  const role = session.user.role as UserRole
  const { courseUid, lessonUid } = await Promise.resolve(params)

  const lesson = await db.lesson.findUnique({
    where: { lessonUid },
    include: {
      course: { select: { courseUid: true, title: true, authorUid: true, isPublished: true } },
    },
  })

  if (!lesson || lesson.courseUid !== courseUid) notFound()

  // доступ: админ/преподаватель (если может редактировать курс), или записан на курс, или урок бесплатный
  const isTeacher = hasRole(role, ROLES.TEACHER)
  if (isTeacher && !canEditCourse(role, lesson.course.authorUid, userUid) && role !== ROLES.ADMIN) {
    // teacher but not owner/moderator+
    // allow enrolled-only access below
  }

  const enrollment = await db.enrollment.findUnique({
    where: { userUid_courseUid: { userUid, courseUid } },
    select: { enrollmentUid: true },
  })

  const canAccess =
    role === ROLES.ADMIN ||
    (isTeacher && canEditCourse(role, lesson.course.authorUid, userUid)) ||
    !!enrollment ||
    lesson.isFree

  if (!canAccess) notFound()

  const lessons = await db.lesson.findMany({
    where: { courseUid },
    orderBy: { orderIndex: "asc" },
    select: { lessonUid: true, title: true, isFree: true },
  })

  const currentIndex = lessons.findIndex((l) => l.lessonUid === lessonUid)
  const prev = currentIndex > 0 ? lessons[currentIndex - 1] : null
  const next = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null

  const progress = await db.progress.findUnique({
    where: { userUid_lessonUid: { userUid, lessonUid } },
  })

  const watchedSeconds = progress?.watchedSeconds ?? 0
  const duration = lesson.duration ?? 0
  const percent = duration > 0 ? Math.min(100, (watchedSeconds / duration) * 100) : progress?.completed ? 100 : 0
  const isCompleted = progress?.completed ?? false

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href={`/courses/${courseUid}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к курсу
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          {prev && (
            <Link href={`/courses/${courseUid}/lessons/${prev.lessonUid}`}>
              <Button variant="outline" size="sm">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Предыдущий
              </Button>
            </Link>
          )}
          {next && (
            <Link href={`/courses/${courseUid}/lessons/${next.lessonUid}`}>
              <Button variant="outline" size="sm">
                Следующий
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">{lesson.title}</h1>
        <p className="text-muted-foreground">{lesson.course.title}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {lesson.isFree && <Badge variant="secondary">Бесплатный</Badge>}
          {isCompleted ? (
            <Badge className="bg-green-500 hover:bg-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Завершен
            </Badge>
          ) : (
            <Badge variant="outline">
              <Play className="h-3 w-3 mr-1" />
              В процессе
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {lesson.videoUrl ? (
            <VideoPlayer
              videoUrl={lesson.videoUrl}
              title={lesson.title}
              description={lesson.description}
              lessonUid={lesson.lessonUid}
            />
          ) : (
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Материал урока</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {lesson.content || "Контент урока пока не добавлен."}
                </p>
              </CardContent>
            </Card>
          )}

          {lesson.content && lesson.videoUrl && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Конспект</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {lesson.content}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1 space-y-4">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Прогресс урока</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Просмотрено</span>
                <span className="font-semibold">{Math.round(percent)}%</span>
              </div>
              <Progress value={percent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Прогресс сохраняется автоматически.
              </p>
              {!isCompleted && (
                <div className="pt-2">
                  <CompleteLessonButton lessonUid={lesson.lessonUid} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle>Содержание</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lessons.map((l, idx) => (
                <Link
                  key={l.lessonUid}
                  href={`/courses/${courseUid}/lessons/${l.lessonUid}`}
                  className={`block p-2 rounded-md border hover:bg-accent transition-colors ${
                    l.lessonUid === lessonUid ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground mt-0.5 min-w-[20px]">
                      {idx + 1}.
                    </span>
                    <span className="text-sm leading-relaxed">{l.title}</span>
                    {l.isFree && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        free
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

