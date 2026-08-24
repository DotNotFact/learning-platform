import Link from "next/link"
import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { hasRole, ROLES } from "@/lib/rbac"
import type { UserRole } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreateAssignmentDialog } from "@/components/assignments/CreateAssignmentDialog"
import { format } from "date-fns"
import { ru } from "date-fns/locale/ru"
import { BookOpen, ClipboardList, ExternalLink } from "lucide-react"

type LessonForForm = {
  lessonUid: string
  title: string
  course: { title: string }
}

type QuizForForm = {
  quizUid: string
  title: string
  course: { title: string }
}

type AssignmentListItem = {
  assignmentUid: string
  title: string
  dueDate: Date | null
  maxScore: number
  lesson?: {
    course?: {
      title: string
    }
  } | null
  submissions?: Array<{
    submissionUid: string
    gradedAt?: Date | null
  }>
}

export default async function AssignmentsPage() {
  const session = await requireAuth()
  const userUid = session.user.id
  const role = session.user.role as UserRole

  const isTeacher = hasRole(role, ROLES.TEACHER)
  const canManageAllCourses = hasRole(role, ROLES.MODERATOR)

  const [lessonsForForm, quizzesForForm] = isTeacher
    ? await Promise.all([
        db.lesson.findMany({
          where: canManageAllCourses ? {} : { course: { authorUid: userUid } },
          select: {
            lessonUid: true,
            title: true,
            course: { select: { title: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        }),
        db.quiz.findMany({
          where: canManageAllCourses ? {} : { course: { authorUid: userUid } },
          select: {
            quizUid: true,
            title: true,
            course: { select: { title: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        }),
      ])
    : [[], []]

  const assignments = isTeacher
    ? await db.assignment.findMany({
        where: { authorUid: userUid },
        include: {
          lesson: {
            select: {
              lessonUid: true,
              title: true,
              courseUid: true,
              course: { select: { courseUid: true, title: true, authorUid: true } },
            },
          },
          submissions: { select: { submissionUid: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : await (async () => {
        const enrollments = await db.enrollment.findMany({
          where: { userUid },
          select: { courseUid: true },
        })
        const courseUids = enrollments.map((e) => e.courseUid)
        if (courseUids.length === 0) return []

        const lessons = await db.lesson.findMany({
          where: { courseUid: { in: courseUids } },
          select: { lessonUid: true },
        })
        const lessonUids = lessons.map((l) => l.lessonUid)
        if (lessonUids.length === 0) return []

        return db.assignment.findMany({
          where: { lessonUid: { in: lessonUids } },
          include: {
            lesson: {
              select: {
                lessonUid: true,
                title: true,
                courseUid: true,
                course: { select: { courseUid: true, title: true, authorUid: true } },
              },
            },
            submissions: {
              where: { userUid },
              orderBy: { submittedAt: "desc" },
              take: 1,
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      })()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-primary" />
            Задания
          </h1>
          <p className="text-muted-foreground">
            {isTeacher ? "Ваши задания и сдачи студентов" : "Задания по вашим курсам"}
          </p>
        </div>
        {isTeacher && (
          <CreateAssignmentDialog
            lessons={lessonsForForm.map((lesson: LessonForForm) => ({
              lessonUid: lesson.lessonUid,
              title: lesson.title,
              courseTitle: lesson.course.title,
            }))}
            quizzes={quizzesForForm.map((quiz: QuizForForm) => ({
              quizUid: quiz.quizUid,
              title: quiz.title,
              courseTitle: quiz.course.title,
            }))}
          />
        )}
      </div>

      {assignments.length === 0 ? (
        <Card className="border-2">
          <CardContent className="py-16 text-center">
            <div className="mb-4 text-6xl">📝</div>
            <h3 className="text-xl font-semibold mb-2">Пока нет заданий</h3>
            <p className="text-muted-foreground">
              {isTeacher
                ? "Создайте задание, чтобы студенты могли его выполнить"
                : "Когда преподаватель добавит задания, они появятся здесь"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {(assignments as AssignmentListItem[]).map((a) => {
            const submissions = Array.isArray(a.submissions) ? a.submissions : []
            const submission = submissions[0] ?? null
            const isSubmitted = !!submission
            const isGraded = isSubmitted && submission.gradedAt

            return (
              <Link key={a.assignmentUid} href={`/assignments/${a.assignmentUid}`} className="block">
                <Card className="border-2 hover:shadow-md transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <CardTitle className="text-xl line-clamp-2">{a.title}</CardTitle>
                        {a.lesson?.course?.title && (
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            {a.lesson.course.title}
                          </p>
                        )}
                      </div>
                      <ExternalLink className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {a.dueDate && (
                        <Badge variant="secondary">
                          До: {format(new Date(a.dueDate), "d MMM yyyy", { locale: ru })}
                        </Badge>
                      )}
                      <Badge variant="outline">Макс: {a.maxScore}</Badge>
                      {!isTeacher && (
                        <>
                          {isSubmitted ? (
                            <Badge className={isGraded ? "bg-green-500 hover:bg-green-600" : "bg-blue-500 hover:bg-blue-600"}>
                              {isGraded ? "Проверено" : "Отправлено"}
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Не отправлено</Badge>
                          )}
                        </>
                      )}
                      {isTeacher && (
                        <Badge variant="outline">Сдач: {submissions.length}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
