import { requireAdmin } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { AdminPanel } from "@/components/admin/AdminPanel"
import type { AdminComment } from "@/components/admin/CommentsModerationTable"
import type { AdminNotification } from "@/components/admin/NotificationsAdminPanel"
import type { CourseDetails, TagWithCount, UserBasic, UserRole } from "@/types"
import { getAdminAnalytics } from "@/lib/admin-analytics"

export default async function AdminPage() {
  await requireAdmin()

  const coursesData = await db.course.findMany({
    include: {
      author: {
        select: {
          name: true,
          email: true,
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
    orderBy: {
      createdAt: "desc",
    },
  })

  const courses: CourseDetails[] = coursesData.map((course: {
    courseUid: string
    title: string
    description: string | null
    thumbnailUrl: string | null
    categoryUid: string | null
    orderIndex: number
    isPublished: boolean
    difficulty: string | null
    estimatedHours: number | null
    price: number | null
    createdAt: Date
    updatedAt: Date
    authorUid: string
    author: { name: string | null; email: string }
    lessons: Array<{
      lessonUid: string
      title: string
      description: string | null
      content: string | null
      videoUrl: string | null
      duration: number | null
      orderIndex: number
      isFree: boolean
      courseUid: string
      createdAt: Date
      updatedAt: Date
    }>
    quizzes: Array<{
      quizUid: string
      title: string
      description: string | null
      courseUid: string
      createdAt: Date
      updatedAt: Date
      questions: Array<{
        questionUid: string
        text: string
        options: string
        correctOptions: string
        explanation: string | null
        quizUid: string
        orderIndex: number
      }>
    }>
  }) => ({
    courseUid: course.courseUid,
    title: course.title,
    description: course.description,
    thumbnailUrl: course.thumbnailUrl,
    categoryUid: course.categoryUid,
    orderIndex: course.orderIndex,
    isPublished: course.isPublished,
    difficulty: course.difficulty,
    estimatedHours: course.estimatedHours,
    price: course.price,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    authorUid: course.authorUid,
    author: {
      name: course.author.name,
      email: course.author.email,
    },
    lessons: course.lessons.map((lesson: {
      lessonUid: string
      title: string
      description: string | null
      content: string | null
      videoUrl: string | null
      duration: number | null
      orderIndex: number
      isFree: boolean
      courseUid: string
      createdAt: Date
      updatedAt: Date
    }) => ({
      lessonUid: lesson.lessonUid,
      title: lesson.title,
      description: lesson.description,
      content: lesson.content,
      videoUrl: lesson.videoUrl,
      duration: lesson.duration,
      orderIndex: lesson.orderIndex,
      isFree: lesson.isFree,
      courseUid: lesson.courseUid,
      createdAt: lesson.createdAt,
      updatedAt: lesson.updatedAt,
    })),
    videos: course.lessons.filter((lesson) => lesson.videoUrl).map((lesson: {
      lessonUid: string
      title: string
      description: string | null
      videoUrl: string | null
      duration: number | null
      orderIndex: number
      courseUid: string
      createdAt: Date
    }) => ({
      videoUid: lesson.lessonUid,
      title: lesson.title,
      description: lesson.description,
      videoUrl: lesson.videoUrl || "",
      duration: lesson.duration,
      orderIndex: lesson.orderIndex,
      courseUid: lesson.courseUid,
      createdAt: lesson.createdAt,
    })),
    quizzes: course.quizzes.map((quiz: {
      quizUid: string
      title: string
      description: string | null
      courseUid: string
      createdAt: Date
      updatedAt: Date
      questions: Array<{
        questionUid: string
        text: string
        options: string
        correctOptions: string
        explanation: string | null
        quizUid: string
        orderIndex: number
      }>
    }) => ({
      quizUid: quiz.quizUid,
      title: quiz.title,
      description: quiz.description,
      courseUid: quiz.courseUid,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
      questions: quiz.questions.map((q: {
        questionUid: string
        text: string
        options: string
        correctOptions: string
        explanation: string | null
        quizUid: string
        orderIndex: number
      }) => ({
        questionUid: q.questionUid,
        text: q.text,
        options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
        correctOptions:
          typeof q.correctOptions === "string" ? JSON.parse(q.correctOptions) : q.correctOptions,
        explanation: q.explanation,
        quizUid: q.quizUid,
        orderIndex: q.orderIndex,
      })),
    })),
  }))

  const users = await db.user.findMany({
    select: {
      userUid: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  const typedUsers: UserBasic[] = users.map((user) => ({
    ...user,
    role: user.role as UserRole,
  }))

  const categories = await db.category.findMany({
    include: { _count: { select: { courses: true } } },
    orderBy: { orderIndex: "asc" },
  })

  const categoriesWithCount = categories.map((c) => ({
    ...c,
    coursesCount: c._count.courses,
  }))

  const tags = await db.tag.findMany({
    include: { _count: { select: { courses: true } } },
    orderBy: { name: "asc" },
  })
  const tagsWithCount: TagWithCount[] = tags.map((t) => ({
    tagUid: t.tagUid,
    name: t.name,
    slug: t.slug,
    createdAt: t.createdAt,
    coursesCount: t._count.courses,
  }))

  const comments: AdminComment[] = await db.comment.findMany({
    include: {
      user: { select: { userUid: true, name: true, email: true } },
      course: { select: { courseUid: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  const notifications: AdminNotification[] = await db.notification.findMany({
    include: {
      user: { select: { userUid: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  const analytics = await getAdminAnalytics()

  return (
    <AdminPanel
      initialCourses={courses}
      initialUsers={typedUsers}
      initialCategories={categoriesWithCount}
      initialTags={tagsWithCount}
      initialComments={comments}
      initialNotifications={notifications}
      initialAnalytics={analytics}
    />
  )
}
