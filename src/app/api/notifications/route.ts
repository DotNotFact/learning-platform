import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * GET /api/notifications
 * Get user's notifications
 * Query params:
 * - limit: number (default: 50)
 * - unreadOnly: boolean (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userUid = session.user.id

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50", 10)
    const unreadOnly = searchParams.get("unreadOnly") === "true"

    const where: {
      userUid: string
      isRead?: boolean
    } = {
      userUid,
    }

    if (unreadOnly) {
      where.isRead = false
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    })

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json(
      { error: "Ошибка при получении уведомлений" },
      { status: 500 }
    )
  }
}
