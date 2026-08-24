import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * GET /api/favorites/[courseUid]
 * Check if course is favorited by current user
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ courseUid: string }> | { courseUid: string } }
) {
  try {
    const session = await requireAuth()
    const userUid = session.user.id
    const { courseUid } = await Promise.resolve(params)

    const favorite = await db.courseFavorite.findUnique({
      where: { userUid_courseUid: { userUid, courseUid } },
      select: { userUid: true },
    })

    return NextResponse.json({ isFavorited: Boolean(favorite) })
  } catch (error) {
    console.error("Error checking favorite:", error)
    return NextResponse.json({ error: "Ошибка при проверке избранного" }, { status: 500 })
  }
}

/**
 * POST /api/favorites/[courseUid]
 * Add course to favorites for current user
 */
export async function POST(
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

    await db.courseFavorite.upsert({
      where: { userUid_courseUid: { userUid, courseUid } },
      create: { userUid, courseUid },
      update: {},
    })

    return NextResponse.json({ success: true, isFavorited: true })
  } catch (error) {
    console.error("Error adding favorite:", error)
    return NextResponse.json({ error: "Ошибка при добавлении в избранное" }, { status: 500 })
  }
}

/**
 * DELETE /api/favorites/[courseUid]
 * Remove course from favorites for current user
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ courseUid: string }> | { courseUid: string } }
) {
  try {
    const session = await requireAuth()
    const userUid = session.user.id
    const { courseUid } = await Promise.resolve(params)

    await db.courseFavorite.deleteMany({
      where: { userUid, courseUid },
    })

    return NextResponse.json({ success: true, isFavorited: false })
  } catch (error) {
    console.error("Error removing favorite:", error)
    return NextResponse.json({ error: "Ошибка при удалении из избранного" }, { status: 500 })
  }
}

