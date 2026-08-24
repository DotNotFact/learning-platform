import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all user's notifications as read
 */
export async function PATCH(_request: NextRequest) {
  try {
    const session = await requireAuth()
    const userUid = session.user.id

    const result = await db.notification.updateMany({
      where: {
        userUid,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    })

    return NextResponse.json({
      message: "Все уведомления отмечены как прочитанные",
      count: result.count,
    })
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    return NextResponse.json(
      { error: "Ошибка при обновлении уведомлений" },
      { status: 500 }
    )
  }
}
