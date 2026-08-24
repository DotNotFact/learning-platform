import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * GET /api/favorites
 * List current user's favorite courses
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await requireAuth()
    const userUid = session.user.id

    const favorites = await db.courseFavorite.findMany({
      where: { userUid },
      orderBy: { createdAt: "desc" },
      include: {
        course: {
          include: {
            author: { select: { name: true } },
            category: { select: { name: true } },
            tags: { include: { tag: true } },
          },
        },
      },
    })

    return NextResponse.json({
      favorites: favorites.map((f) => ({
        createdAt: f.createdAt,
        course: f.course,
      })),
    })
  } catch (error) {
    console.error("Error fetching favorites:", error)
    return NextResponse.json({ error: "Ошибка при получении избранного" }, { status: 500 })
  }
}

