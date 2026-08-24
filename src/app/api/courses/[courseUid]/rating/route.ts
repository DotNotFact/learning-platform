import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

const upsertSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(2000).optional().nullable(),
})

/**
 * GET /api/courses/[courseUid]/rating
 * Returns rating summary + current user's rating (if any)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ courseUid: string }> | { courseUid: string } }
) {
  try {
    const session = await requireAuth()
    const userUid = session.user.id
    const { courseUid } = await Promise.resolve(params)

    const course = await db.course.findUnique({
      where: { courseUid },
      select: { courseUid: true, isPublished: true },
    })
    if (!course || !course.isPublished) {
      return NextResponse.json({ error: "Курс не найден" }, { status: 404 })
    }

    const [agg, my] = await Promise.all([
      db.courseRating.aggregate({
        where: { courseUid },
        _avg: { rating: true },
        _count: { ratingUid: true },
      }),
      db.courseRating.findUnique({
        where: { userUid_courseUid: { userUid, courseUid } },
        select: { rating: true, review: true, updatedAt: true },
      }),
    ])

    return NextResponse.json({
      summary: {
        average: agg._avg.rating ?? 0,
        count: agg._count.ratingUid ?? 0,
      },
      myRating: my ?? null,
    })
  } catch (error) {
    console.error("Error fetching course rating:", error)
    return NextResponse.json({ error: "Ошибка при получении рейтинга" }, { status: 500 })
  }
}

/**
 * PUT /api/courses/[courseUid]/rating
 * Set/update current user's rating (requires enrollment)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ courseUid: string }> | { courseUid: string } }
) {
  try {
    const session = await requireAuth()
    const userUid = session.user.id
    const { courseUid } = await Promise.resolve(params)
    const body = await request.json()
    const data = upsertSchema.parse(body)

    const course = await db.course.findUnique({
      where: { courseUid },
      select: { courseUid: true, isPublished: true },
    })
    if (!course || !course.isPublished) {
      return NextResponse.json({ error: "Курс не найден" }, { status: 404 })
    }

    const enrollment = await db.enrollment.findUnique({
      where: { userUid_courseUid: { userUid, courseUid } },
      select: { enrollmentUid: true },
    })
    if (!enrollment) {
      return NextResponse.json({ error: "Можно оценивать только после записи на курс" }, { status: 403 })
    }

    const ratingRow = await db.courseRating.upsert({
      where: { userUid_courseUid: { userUid, courseUid } },
      create: {
        userUid,
        courseUid,
        rating: data.rating,
        review: data.review ?? null,
      },
      update: {
        rating: data.rating,
        review: data.review ?? null,
      },
      select: { rating: true, review: true, updatedAt: true },
    })

    return NextResponse.json({ myRating: ratingRow })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные", details: error.issues }, { status: 400 })
    }
    console.error("Error setting course rating:", error)
    return NextResponse.json({ error: "Ошибка при сохранении рейтинга" }, { status: 500 })
  }
}

