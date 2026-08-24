import Link from "next/link"
import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { canEditCourse, hasRole, ROLES } from "@/lib/rbac"
import type { UserRole } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AssignmentSubmissionForm } from "@/components/assignments/AssignmentSubmissionForm"
import { GradeSubmissionForm } from "@/components/assignments/GradeSubmissionForm"
import { QuizComponent } from "@/components/courses/QuizComponent"
import { CopyLinkButton } from "@/components/assignments/CopyLinkButton"
import { format } from "date-fns"
import { ru } from "date-fns/locale/ru"
import { ArrowLeft, BookOpen, CheckCircle2, ClipboardList, Link2, User, Video, Image as ImageIcon } from "lucide-react"
import Image from "next/image"

type SubmissionWithUser = {
  submissionUid: string
  submittedAt: Date
  gradedAt: Date | null
  score: number | null
  feedback: string | null
  content: string
  user?: { userUid: string; name: string | null; email: string }
}

interface PageProps {
  params:
    | Promise<{ assignmentUid: string }>
    | { assignmentUid: string }
}

export default async function AssignmentPage({ params }: PageProps) {
  const session = await requireAuth()
  const userUid = session.user.id
  const role = session.user.role as UserRole
  const resolvedParams = await Promise.resolve(params)

    const assignment = await db.assignment.findUnique({
      where: { assignmentUid: resolvedParams.assignmentUid },
      include: {
        lesson: {
          select: {
            lessonUid: true,
            title: true,
            courseUid: true,
            course: { select: { courseUid: true, title: true, authorUid: true } },
          },
        },
        quiz: {
          select: {
            quizUid: true,
            title: true,
            description: true,
            questions: {
              select: {
                questionUid: true,
                text: true,
                options: true,
                correctOptions: true,
                explanation: true,
              },
            },
          },
        },
        submissions: hasRole(role, ROLES.TEACHER)
          ? {
              include: {
                user: { select: { userUid: true, name: true, email: true } },
              },
            orderBy: { submittedAt: "desc" },
          }
        : {
            where: { userUid },
            orderBy: { submittedAt: "desc" },
            take: 1,
          },
    },
  })

  if (!assignment) notFound()

  const isTeacher = hasRole(role, ROLES.TEACHER)
  const course = assignment.lesson?.course

  if (isTeacher && course && !canEditCourse(role, course.authorUid, userUid)) {
    notFound()
  }

  if (!isTeacher && assignment.lesson?.courseUid) {
    const enrollment = await db.enrollment.findUnique({
      where: {
        userUid_courseUid: { userUid, courseUid: assignment.lesson.courseUid },
      },
      select: { enrollmentUid: true },
    })
    if (!enrollment) notFound()
  }

  const mySubmission = !isTeacher && Array.isArray(assignment.submissions) ? assignment.submissions[0] : null
  const assignmentLink = `/assignments/${assignment.assignmentUid}`
  const allSubmissions = Array.isArray(assignment.submissions)
    ? (assignment.submissions as SubmissionWithUser[])
    : []
  const pendingSubmissions = allSubmissions.filter((submission) => !submission.gradedAt)
  const gradedSubmissions = allSubmissions.filter((submission) => submission.gradedAt)

  const renderSubmission = (submission: SubmissionWithUser) => (
    <div key={submission.submissionUid} className="border rounded-lg p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium truncate">
              {submission.user?.name || submission.user?.email}
            </span>
            {submission.gradedAt && (
              <Badge className="bg-green-500 hover:bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Проверено
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Отправлено: {format(new Date(submission.submittedAt), "d MMM yyyy", { locale: ru })}
          </div>
        </div>
        {submission.score !== null && (
          <Badge variant="outline">
            {submission.score} / {assignment.maxScore}
          </Badge>
        )}
      </div>

      <div className="text-sm">
        <div className="font-medium mb-2">Ответ</div>
        <p className="text-muted-foreground whitespace-pre-wrap">
          {submission.content}
        </p>
      </div>

      <div className="pt-4 border-t">
        <GradeSubmissionForm
          submissionUid={submission.submissionUid}
          maxScore={assignment.maxScore}
          defaultScore={submission.score}
          defaultFeedback={submission.feedback}
        />
      </div>
    </div>
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/assignments">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к заданиям
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-primary" />
          {assignment.title}
        </h1>
        {course && (
          <p className="text-muted-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <Link href={`/courses/${course.courseUid}`} className="hover:text-primary transition-colors">
              {course.title}
            </Link>
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Описание</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignment.description ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {assignment.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Описание не указано</p>
              )}
              {assignment.instructions && (
                <div className="pt-4 border-t">
                  <div className="text-sm font-medium mb-2">Инструкция</div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {assignment.instructions}
                  </p>
                </div>
              )}
              {(assignment.videoUrl || assignment.imageUrl || assignment.resourceUrl || assignment.meetingUrl) && (
                <div className="pt-4 border-t space-y-4">
                  <div className="text-sm font-medium">Материалы и ссылки</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {assignment.videoUrl && (
                      <a
                        href={assignment.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:border-primary hover:text-primary transition-colors"
                      >
                        <Video className="h-4 w-4" />
                        <span>Видео к заданию</span>
                      </a>
                    )}
                    {assignment.resourceUrl && (
                      <a
                        href={assignment.resourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:border-primary hover:text-primary transition-colors"
                      >
                        <Link2 className="h-4 w-4" />
                        <span>Материалы/файл</span>
                      </a>
                    )}
                    {assignment.meetingUrl && (
                      <a
                        href={assignment.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:border-primary hover:text-primary transition-colors"
                      >
                        <Link2 className="h-4 w-4" />
                        <span>Ссылка на встречу</span>
                      </a>
                    )}
                  </div>
                  {assignment.imageUrl && (
                    <div className="rounded-lg border overflow-hidden">
                      <div className="flex items-center gap-2 border-b px-3 py-2 text-sm font-medium text-muted-foreground">
                        <ImageIcon className="h-4 w-4" />
                        <span>Изображение</span>
                      </div>
                      <Image
                        src={assignment.imageUrl}
                        alt="Материалы задания"
                        width={960}
                        height={420}
                        className="w-full max-h-[420px] object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {assignment.quiz && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Контрольная работа</CardTitle>
              </CardHeader>
              <CardContent>
                <QuizComponent
                  quizUid={assignment.quiz.quizUid}
                  title={assignment.quiz.title}
                  description={assignment.quiz.description}
                  questions={assignment.quiz.questions.map((q) => ({
                    questionUid: q.questionUid,
                    text: q.text,
                    options: typeof q.options === "string" ? JSON.parse(q.options) : (q.options as Array<{ optionUid: string; text: string }>),
                    correctOptions: typeof q.correctOptions === "string" ? JSON.parse(q.correctOptions) : (q.correctOptions as string[]),
                    explanation: q.explanation,
                  }))}
                />
              </CardContent>
            </Card>
          )}

          {!isTeacher && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Сдача задания</CardTitle>
              </CardHeader>
              <CardContent>
                {mySubmission ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={mySubmission.gradedAt ? "bg-green-500 hover:bg-green-600" : "bg-blue-500 hover:bg-blue-600"}>
                        {mySubmission.gradedAt ? "Проверено" : "Отправлено"}
                      </Badge>
                      {mySubmission.score !== null && (
                        <Badge variant="outline">
                          {mySubmission.score} / {assignment.maxScore}
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        Отправлено: {format(new Date(mySubmission.submittedAt), "d MMM yyyy", { locale: ru })}
                      </Badge>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium mb-2">Ваш ответ</div>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {mySubmission.content}
                      </p>
                    </div>
                    {mySubmission.feedback && (
                      <div className="text-sm pt-4 border-t">
                        <div className="font-medium mb-2">Комментарий преподавателя</div>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {mySubmission.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <AssignmentSubmissionForm assignmentUid={assignment.assignmentUid} />
                )}
              </CardContent>
            </Card>
          )}

          {isTeacher && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Сдачи студентов</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {allSubmissions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Пока нет сдач</p>
                ) : (
                  <div className="space-y-8">
                    {pendingSubmissions.length > 0 && (
                      <div className="space-y-4">
                        <div className="text-sm font-semibold text-muted-foreground">
                          На проверке ({pendingSubmissions.length})
                        </div>
                        {pendingSubmissions.map(renderSubmission)}
                      </div>
                    )}
                    {gradedSubmissions.length > 0 && (
                      <div className="space-y-4">
                        <div className="text-sm font-semibold text-muted-foreground">
                          Проверено ({gradedSubmissions.length})
                        </div>
                        {gradedSubmissions.map(renderSubmission)}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1 space-y-4">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Детали</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignment.dueDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Срок</span>
                  <span className="text-sm font-medium">
                    {format(new Date(assignment.dueDate), "d MMM yyyy", { locale: ru })}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Макс. балл</span>
                <span className="text-sm font-medium">{assignment.maxScore}</span>
              </div>
              {assignment.lesson?.title && (
                <div className="pt-3 border-t">
                  <div className="text-sm text-muted-foreground mb-1">Урок</div>
                  <div className="text-sm font-medium">{assignment.lesson.title}</div>
                </div>
              )}
            </CardContent>
          </Card>
          {isTeacher && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Ссылка для студентов</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground break-all">{assignmentLink}</div>
                <CopyLinkButton value={assignmentLink} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
