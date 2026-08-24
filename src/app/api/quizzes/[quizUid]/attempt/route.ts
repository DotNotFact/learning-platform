import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import * as z from "zod"
import { syncEnrollmentProgress } from "@/lib/course-progress"
import { canEditCourse } from "@/lib/rbac"
import type { UserRole } from "@/types"

const attemptSchema = z.object({
  score: z.number().int().min(0),
  totalQuestions: z.number().int().min(1),
  percentage: z.number().min(0).max(100),
  timeSpent: z.number().int().min(0).optional(),
  answers: z
    .array(
      z.object({
        questionUid: z.string().uuid(),
        selectedOptions: z.array(z.string().uuid()),
      })
    )
    .optional(),
})

export async function GET(
  req: Request,
  { params }: { params: Promise<{ quizUid: string }> | { quizUid: string } }
) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const { searchParams } = new URL(req.url)
    const userUid = searchParams.get("userUid")

    // Админы могут видеть попытки всех пользователей, обычные пользователи - только свои
    const attemptUserUid = session.user.role === "ADMIN" && userUid ? userUid : session.user.id

    const attempts = await db.quizAttempt.findMany({
      where: {
        quizUid: resolvedParams.quizUid,
        userUid: attemptUserUid,
      },
      include: {
        user: {
          select: {
            userUid: true,
            name: true,
            email: true,
          },
        },
        quiz: {
          select: {
            quizUid: true,
            title: true,
          },
        },
      },
      orderBy: {
        completedAt: "desc",
      },
    })

    return NextResponse.json({ attempts })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Произошла ошибка при получении результатов" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ quizUid: string }> | { quizUid: string } }
) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const body = await req.json()
    const data = attemptSchema.parse(body)

    const quiz = await db.quiz.findUnique({
      where: { quizUid: resolvedParams.quizUid },
      select: {
        quizUid: true,
        courseUid: true,
        passingScore: true,
        course: {
          select: {
            price: true,
            isPublished: true,
            authorUid: true,
          },
        },
      },
    })

    if (!quiz || !quiz.course) {
      return NextResponse.json({ error: "Тест не найден" }, { status: 404 })
    }

    const role = session.user.role as UserRole
    const canEdit = canEditCourse(role, quiz.course.authorUid, session.user.id)

    if (!quiz.course.isPublished && !canEdit) {
      return NextResponse.json({ error: "Тест недоступен" }, { status: 403 })
    }

    const isPaidCourse = (quiz.course.price ?? 0) > 0
    if (isPaidCourse && !canEdit) {
      const enrollment = await db.enrollment.findUnique({
        where: { userUid_courseUid: { userUid: session.user.id, courseUid: quiz.courseUid } },
        select: { enrollmentUid: true },
      })

      if (!enrollment) {
        return NextResponse.json(
          { error: "Курс платный. Купите доступ, чтобы проходить тесты." },
          { status: 403 }
        )
      }
    }

    const passingScore = quiz.passingScore ?? 70
    const passed = data.percentage >= passingScore

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
    }

    // Создаем новую попытку (разрешаем множественные попытки)
    const attempt = await db.quizAttempt.create({
      data: {
        userUid: session.user.id,
        quizUid: resolvedParams.quizUid,
        score: data.score,
        totalQuestions: data.totalQuestions,
        percentage: data.percentage,
        passed,
        timeSpent: data.timeSpent,
        answers: data.answers ? JSON.stringify(data.answers) : undefined,
      },
    })

    const summary = await syncEnrollmentProgress(session.user.id, quiz.courseUid)
    if (summary?.isCompleted) {
      const { checkAndIssueCertificate } = await import("@/lib/certificates")
      await checkAndIssueCertificate(session.user.id, quiz.courseUid)
    }

    return NextResponse.json({ attempt }, { status: 201 })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные", details: error.issues }, { status: 400 })
    }

    return NextResponse.json(
      { error: "Произошла ошибка при сохранении результата" },
      { status: 500 }
    )
  }
}
