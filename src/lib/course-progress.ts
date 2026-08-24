import { db } from "@/lib/db"

export interface CourseProgressSummary {
  courseUid: string
  totalLessons: number
  completedLessons: number
  totalQuizzes: number
  passedQuizzes: number
  completedItems: number
  totalItems: number
  progressPercentage: number
  isCompleted: boolean
}

export async function getCourseProgressSummary(
  userUid: string,
  courseUid: string
): Promise<CourseProgressSummary> {
  const [totalLessons, completedLessons, quizzes] = await Promise.all([
    db.lesson.count({ where: { courseUid } }),
    db.progress.count({
      where: {
        userUid,
        completed: true,
        lesson: { courseUid },
      },
    }),
    db.quiz.findMany({
      where: { courseUid },
      select: { quizUid: true, passingScore: true },
    }),
  ])

  const quizUids = quizzes.map((quiz) => quiz.quizUid)
  let passedQuizzes = 0

  if (quizUids.length > 0) {
    const attempts = await db.quizAttempt.findMany({
      where: {
        userUid,
        quizUid: { in: quizUids },
      },
      select: {
        quizUid: true,
        percentage: true,
        passed: true,
      },
      orderBy: { completedAt: "desc" },
    })

    const passingScoreByQuiz = new Map(
      quizzes.map((quiz) => [quiz.quizUid, quiz.passingScore ?? 70])
    )
    const passedQuizUids = new Set<string>()

    for (const attempt of attempts) {
      if (passedQuizUids.has(attempt.quizUid)) continue
      const passingScore = passingScoreByQuiz.get(attempt.quizUid) ?? 70
      if (attempt.passed || attempt.percentage >= passingScore) {
        passedQuizUids.add(attempt.quizUid)
      }
    }

    passedQuizzes = passedQuizUids.size
  }

  const totalQuizzes = quizUids.length
  const completedItems = completedLessons + passedQuizzes
  const totalItems = totalLessons + totalQuizzes
  const progressPercentage =
    totalItems > 0 ? (completedItems / totalItems) * 100 : 0

  return {
    courseUid,
    totalLessons,
    completedLessons,
    totalQuizzes,
    passedQuizzes,
    completedItems,
    totalItems,
    progressPercentage,
    isCompleted: totalItems > 0 && completedItems >= totalItems,
  }
}

export async function ensureEnrollment(userUid: string, courseUid: string) {
  const existing = await db.enrollment.findUnique({
    where: { userUid_courseUid: { userUid, courseUid } },
  })

  if (existing) return existing

  const course = await db.course.findUnique({
    where: { courseUid },
    select: { isPublished: true, price: true },
  })

  if (!course || !course.isPublished) return null
  if ((course.price ?? 0) > 0) return null

  return db.enrollment.create({
    data: { userUid, courseUid },
  })
}

export async function syncEnrollmentProgress(
  userUid: string,
  courseUid: string
) {
  const enrollment = await ensureEnrollment(userUid, courseUid)
  if (!enrollment) return null

  const summary = await getCourseProgressSummary(userUid, courseUid)

  await db.enrollment.update({
    where: { userUid_courseUid: { userUid, courseUid } },
    data: {
      progress: summary.progressPercentage,
      completedAt:
        summary.isCompleted && !enrollment.completedAt ? new Date() : undefined,
    },
  })

  return summary
}
