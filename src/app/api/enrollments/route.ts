import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { z } from "zod"

const enrollSchema = z.object({
  courseUid: z.string().uuid(),
})

/**
 * GET /api/enrollments
 * Get user's enrollments
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await requireAuth()
    const userUid = session.user.id

    const enrollments = await db.enrollment.findMany({
      where: { userUid },
      include: {
        course: {
          select: {
            courseUid: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            author: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        enrolledAt: "desc",
      },
    })

    return NextResponse.json({ enrollments })
  } catch (error) {
    console.error("Error fetching enrollments:", error)
    return NextResponse.json(
      { error: "Ошибка при получении записей" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/enrollments
 * Enroll in a course
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userUid = session.user.id

    let body: Record<string, unknown>
    const contentType = request.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) {
      body = await request.json()
    } else {
      const formData = await request.formData()
      body = Object.fromEntries(formData.entries())
    }
    const { courseUid } = enrollSchema.parse(body)

    const existing = await db.enrollment.findUnique({
      where: {
        userUid_courseUid: {
          userUid,
          courseUid,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Вы уже записаны на этот курс" },
        { status: 400 }
      )
    }

    const course = await db.course.findUnique({
      where: { courseUid },
    })

    if (!course) {
      return NextResponse.json(
        { error: "Курс не найден" },
        { status: 404 }
      )
    }

    if (!course.isPublished) {
      return NextResponse.json(
        { error: "Курс не опубликован" },
        { status: 403 }
      )
    }

    const isAdmin = session.user.role === "ADMIN"
    if ((course.price ?? 0) > 0 && !isAdmin) {
      return NextResponse.json(
        { error: "Курс платный. Используйте покупку, чтобы получить доступ." },
        { status: 403 }
      )
    }

    const enrollment = await db.enrollment.create({
      data: {
        userUid,
        courseUid,
      },
      include: {
        course: {
          select: {
            courseUid: true,
            title: true,
            thumbnailUrl: true,
          },
        },
      },
    })

    return NextResponse.json({ enrollment }, { status: 201 })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверные данные", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating enrollment:", error)
    return NextResponse.json(
      { error: "Ошибка при записи на курс" },
      { status: 500 }
    )
  }
}
