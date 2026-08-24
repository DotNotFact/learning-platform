import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * GET /api/notifications/count
 * Get count of unread notifications for current user
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await requireAuth()
    const userUid = session.user.id

    const count = await db.notification.count({
      where: {
        userUid,
        isRead: false,
      },
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error("Error counting notifications:", error)
    return NextResponse.json(
      { error: "Ошибка при подсчете уведомлений" },
      { status: 500 }
    )
  }
}
