import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { z } from "zod"

const updateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
})

/**
 * PATCH /api/notifications/[notificationUid]
 * Update notification (mark as read/unread)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ notificationUid: string }> | { notificationUid: string } }
) {
  try {
    const session = await requireAuth()
    const userUid = session.user.id
    const resolvedParams = await Promise.resolve(params)

    const body = await request.json()
    const data = updateNotificationSchema.parse(body)

    // Проверяем, что уведомление принадлежит пользователю
    const notification = await db.notification.findUnique({
      where: { notificationUid: resolvedParams.notificationUid },
    })

    if (!notification) {
      return NextResponse.json(
        { error: "Уведомление не найдено" },
        { status: 404 }
      )
    }

    if (notification.userUid !== userUid) {
      return NextResponse.json(
        { error: "Недостаточно прав для изменения уведомления" },
        { status: 403 }
      )
    }

    const updatedNotification = await db.notification.update({
      where: { notificationUid: resolvedParams.notificationUid },
      data: {
        isRead: data.isRead,
      },
    })

    return NextResponse.json({ notification: updatedNotification })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверные данные", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating notification:", error)
    return NextResponse.json(
      { error: "Ошибка при обновлении уведомления" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/notifications/[notificationUid]
 * Delete notification
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ notificationUid: string }> | { notificationUid: string } }
) {
  try {
    const session = await requireAuth()
    const userUid = session.user.id
    const resolvedParams = await Promise.resolve(params)

    // Проверяем, что уведомление принадлежит пользователю
    const notification = await db.notification.findUnique({
      where: { notificationUid: resolvedParams.notificationUid },
    })

    if (!notification) {
      return NextResponse.json(
        { error: "Уведомление не найдено" },
        { status: 404 }
      )
    }

    if (notification.userUid !== userUid) {
      return NextResponse.json(
        { error: "Недостаточно прав для удаления уведомления" },
        { status: 403 }
      )
    }

    await db.notification.delete({
      where: { notificationUid: resolvedParams.notificationUid },
    })

    return NextResponse.json({ message: "Уведомление удалено" })
  } catch (error) {
    console.error("Error deleting notification:", error)
    return NextResponse.json(
      { error: "Ошибка при удалении уведомления" },
      { status: 500 }
    )
  }
}
