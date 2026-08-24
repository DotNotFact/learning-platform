import { db } from "@/lib/db"

export interface AdminAnalyticsSummary {
  usersCount: number
  activeUsersCount: number
  coursesCount: number
  publishedCoursesCount: number
  enrollmentsCount: number
  completedEnrollmentsCount: number
  avgEnrollmentProgress: number
  quizAttemptsCount: number
  passedQuizAttemptsCount: number
  avgQuizPercentage: number
  certificatesCount: number
  submissionsCount: number
  unapprovedCommentsCount: number
  unreadNotificationsCount: number
}

export interface AdminAnalyticsTopCourse {
  courseUid: string
  title: string
  isPublished: boolean
  authorName: string | null
  enrollments: number
  completions: number
  avgProgress: number
}

export interface AdminAnalyticsRecentEnrollment {
  enrollmentUid: string
  enrolledAt: Date
  progress: number
  user: { userUid: string; name: string | null; email: string }
  course: { courseUid: string; title: string }
}

export interface AdminAnalyticsRecentQuizAttempt {
  attemptUid: string
  completedAt: Date
  percentage: number
  passed: boolean
  user: { userUid: string; name: string | null; email: string }
  quiz: { quizUid: string; title: string; course: { courseUid: string; title: string } }
}

export interface AdminAnalytics {
  summary: AdminAnalyticsSummary
  topCourses: AdminAnalyticsTopCourse[]
  recentEnrollments: AdminAnalyticsRecentEnrollment[]
  recentQuizAttempts: AdminAnalyticsRecentQuizAttempt[]
}

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const [
    usersCount,
    activeUsersCount,
    coursesCount,
    publishedCoursesCount,
    enrollmentsCount,
    completedEnrollmentsCount,
    enrollmentAgg,
    quizAttemptsCount,
    passedQuizAttemptsCount,
    quizAgg,
    certificatesCount,
    submissionsCount,
    unapprovedCommentsCount,
    unreadNotificationsCount,
    enrollmentsByCourse,
    completedByCourse,
    recentEnrollments,
    recentQuizAttempts,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { isActive: true } }),
    db.course.count(),
    db.course.count({ where: { isPublished: true } }),
    db.enrollment.count(),
    db.enrollment.count({
      where: {
        OR: [{ progress: { gte: 100 } }, { completedAt: { not: null } }],
      },
    }),
    db.enrollment.aggregate({ _avg: { progress: true } }),
    db.quizAttempt.count(),
    db.quizAttempt.count({ where: { passed: true } }),
    db.quizAttempt.aggregate({ _avg: { percentage: true } }),
    db.certificate.count(),
    db.assignmentSubmission.count(),
    db.comment.count({ where: { isApproved: false } }),
    db.notification.count({ where: { isRead: false } }),
    db.enrollment.groupBy({
      by: ["courseUid"],
      _count: { courseUid: true },
      _avg: { progress: true },
      orderBy: { _count: { courseUid: "desc" } },
      take: 10,
    }),
    db.enrollment.groupBy({
      by: ["courseUid"],
      where: { OR: [{ progress: { gte: 100 } }, { completedAt: { not: null } }] },
      _count: { courseUid: true },
    }),
    db.enrollment.findMany({
      orderBy: { enrolledAt: "desc" },
      take: 10,
      include: {
        user: { select: { userUid: true, name: true, email: true } },
        course: { select: { courseUid: true, title: true } },
      },
    }),
    db.quizAttempt.findMany({
      orderBy: { completedAt: "desc" },
      take: 10,
      include: {
        user: { select: { userUid: true, name: true, email: true } },
        quiz: { select: { quizUid: true, title: true, course: { select: { courseUid: true, title: true } } } },
      },
    }),
  ])

  const courseUids = enrollmentsByCourse.map((r) => r.courseUid)
  const courses = await db.course.findMany({
    where: { courseUid: { in: courseUids } },
    select: { courseUid: true, title: true, isPublished: true, author: { select: { name: true } } },
  })
  const courseByUid = new Map(courses.map((c) => [c.courseUid, c]))
  const completedCountByCourseUid = new Map(
    completedByCourse.map((r) => [r.courseUid, r._count.courseUid])
  )

  const topCourses: AdminAnalyticsTopCourse[] = enrollmentsByCourse
    .map((r) => {
      const c = courseByUid.get(r.courseUid)
      if (!c) return null
      return {
        courseUid: c.courseUid,
        title: c.title,
        isPublished: c.isPublished,
        authorName: c.author?.name ?? null,
        enrollments: r._count.courseUid,
        completions: completedCountByCourseUid.get(r.courseUid) ?? 0,
        avgProgress: r._avg.progress ?? 0,
      }
    })
    .filter((x): x is AdminAnalyticsTopCourse => Boolean(x))

  const summary: AdminAnalyticsSummary = {
    usersCount,
    activeUsersCount,
    coursesCount,
    publishedCoursesCount,
    enrollmentsCount,
    completedEnrollmentsCount,
    avgEnrollmentProgress: enrollmentAgg._avg.progress ?? 0,
    quizAttemptsCount,
    passedQuizAttemptsCount,
    avgQuizPercentage: quizAgg._avg.percentage ?? 0,
    certificatesCount,
    submissionsCount,
    unapprovedCommentsCount,
    unreadNotificationsCount,
  }

  return {
    summary,
    topCourses,
    recentEnrollments,
    recentQuizAttempts,
  }
}

