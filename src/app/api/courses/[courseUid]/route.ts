import { NextResponse } from "next/server"
import { requireAuth, requireTeacher } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { canEditCourse, canDeleteCourse } from "@/lib/rbac"
import * as z from "zod"

const updateCourseSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  categoryUid: z.string().uuid().optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  estimatedHours: z.number().int().min(0).optional(),
  price: z.number().min(0).optional(),
  isPublished: z.boolean().optional(),
  orderIndex: z.number().int().min(0).optional(),
})

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseUid: string }> | { courseUid: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const course = await db.course.findUnique({
      where: {
        courseUid: resolvedParams.courseUid,
      },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        category: true,
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
      return NextResponse.json({ error: "Курс не найден" }, { status: 404 })
    }

    const videos = course.lessons
      .filter((lesson) => lesson.videoUrl)
      .map((lesson) => ({
        videoUid: lesson.lessonUid,
        title: lesson.title,
        description: lesson.description,
        videoUrl: lesson.videoUrl || "",
        duration: lesson.duration,
        orderIndex: lesson.orderIndex,
        courseUid: lesson.courseUid,
        createdAt: lesson.createdAt,
      }))

    const courseResponse = {
      ...course,
      videos,
      quizzes: course.quizzes.map((quiz: { questions: Array<{ options: string; correctOptions: string }> }) => ({
        ...quiz,
        questions: quiz.questions.map((q: { options: string; correctOptions: string }) => ({
          ...q,
          options: JSON.parse(q.options),
          correctOptions: JSON.parse(q.correctOptions),
        })),
      })),
    }

    return NextResponse.json({ course: courseResponse })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Произошла ошибка при получении курса" }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ courseUid: string }> | { courseUid: string } }
) {
  try {
    await requireTeacher()
    const session = await requireAuth()
    const resolvedParams = await Promise.resolve(params)
    
    const existingCourse = await db.course.findUnique({
      where: { courseUid: resolvedParams.courseUid },
      select: { authorUid: true, title: true, isPublished: true },
    })

    if (!existingCourse) {
      return NextResponse.json({ error: "Курс не найден" }, { status: 404 })
    }

    if (!canEditCourse(session.user.role, existingCourse.authorUid, session.user.id)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })
    }

    const body = await req.json()
    const data = updateCourseSchema.parse(body)

    // Проверяем, публикуется ли курс впервые
    const wasPublished = existingCourse.isPublished
    const isNowPublished = data.isPublished

    const course = await db.course.update({
      where: {
        courseUid: resolvedParams.courseUid,
      },
      data: {
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl === "" ? null : data.thumbnailUrl,
        categoryUid: data.categoryUid,
        difficulty: data.difficulty,
        estimatedHours: data.estimatedHours,
        price: data.price,
        isPublished: data.isPublished,
        orderIndex: data.orderIndex,
      },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        category: true,
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

    // Отправляем уведомление автору, если курс был опубликован впервые
    if (!wasPublished && isNowPublished) {
      const { notifyCoursePublished } = await import("@/lib/notifications")
      await notifyCoursePublished(resolvedParams.courseUid, course.title)
    }

    return NextResponse.json({ course })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные", details: error.issues }, { status: 400 })
    }

    return NextResponse.json({ error: "Произошла ошибка при обновлении курса" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ courseUid: string }> | { courseUid: string } }
) {
  try {
    await requireTeacher()
    const session = await requireAuth()
    const resolvedParams = await Promise.resolve(params)

    if (!canDeleteCourse(session.user.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })
    }

    const courseUid = resolvedParams.courseUid

    // Получаем все уроки и тесты курса
    const lessons = await db.lesson.findMany({
      where: { courseUid },
      select: { lessonUid: true },
    })

    const quizzes = await db.quiz.findMany({
      where: { courseUid },
      select: { quizUid: true },
    })

    const lessonUids = lessons.map((l) => l.lessonUid)
    const quizUids = quizzes.map((q) => q.quizUid)

    // Удаляем в правильном порядке (с учетом foreign keys)
    // 1. Удаляем связанные с заданиями
    if (lessonUids.length > 0) {
      const assignments = await db.assignment.findMany({
        where: {
          lessonUid: { in: lessonUids },
        },
        select: { assignmentUid: true },
      })

      const assignmentUids = assignments.map((a) => a.assignmentUid)

      if (assignmentUids.length > 0) {
        await db.assignmentSubmission.deleteMany({
          where: {
            assignmentUid: { in: assignmentUids },
          },
        })
      }

      await db.assignment.deleteMany({
        where: {
          lessonUid: { in: lessonUids },
        },
      })
    }

    // 2. Удаляем прогресс по урокам
    if (lessonUids.length > 0) {
      await db.progress.deleteMany({
        where: {
          lessonUid: { in: lessonUids },
        },
      })
    }

    // 3. Удаляем попытки прохождения тестов
    if (quizUids.length > 0) {
      await db.quizAttempt.deleteMany({
        where: {
          quizUid: { in: quizUids },
        },
      })

      // 4. Удаляем вопросы тестов
      await db.question.deleteMany({
        where: {
          quizUid: { in: quizUids },
        },
      })
    }

    // 5. Удаляем тесты
    await db.quiz.deleteMany({
      where: { courseUid },
    })

    // 6. Удаляем уроки
    await db.lesson.deleteMany({
      where: { courseUid },
    })

    // 7. Удаляем сертификаты
    await db.certificate.deleteMany({
      where: { courseUid },
    })

    // 8. Удаляем записи на курс
    await db.enrollment.deleteMany({
      where: { courseUid },
    })

    // 9. Удаляем комментарии
    await db.comment.deleteMany({
      where: { courseUid },
    })

    // 10. Удаляем связи с тегами
    await db.courseTag.deleteMany({
      where: { courseUid },
    })

    // 11. Удаляем сам курс
    await db.course.delete({
      where: {
        courseUid,
      },
    })

    return NextResponse.json({ message: "Курс удален" })
  } catch (error) {
    console.error("Ошибка при удалении курса:", error)
    return NextResponse.json({ error: "Произошла ошибка при удалении курса" }, { status: 500 })
  }
}
