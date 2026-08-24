import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireManager } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  isRead: z.boolean().optional(),
})

/**
 * PATCH /api/admin/notifications/[notificationUid]
 * Manager+ can mark any notification read/unread
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ notificationUid: string }> | { notificationUid: string } }
) {
  try {
    await requireManager()
    const { notificationUid } = await Promise.resolve(params)
    const body = await request.json()
    const data = patchSchema.parse(body)

    const existing = await db.notification.findUnique({ where: { notificationUid } })
    if (!existing) {
      return NextResponse.json({ error: "Уведомление не найдено" }, { status: 404 })
    }

    const updated = await db.notification.update({
      where: { notificationUid },
      data: { isRead: data.isRead },
      include: {
        user: { select: { userUid: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ notification: updated })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверные данные", details: error.issues },
        { status: 400 }
      )
    }
    console.error("Error updating admin notification:", error)
    return NextResponse.json(
      { error: "Ошибка при обновлении уведомления" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/notifications/[notificationUid]
 * Manager+ can delete any notification
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ notificationUid: string }> | { notificationUid: string } }
) {
  try {
    await requireManager()
    const { notificationUid } = await Promise.resolve(params)

    const existing = await db.notification.findUnique({ where: { notificationUid } })
    if (!existing) {
      return NextResponse.json({ error: "Уведомление не найдено" }, { status: 404 })
    }

    await db.notification.delete({ where: { notificationUid } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting admin notification:", error)
    return NextResponse.json(
      { error: "Ошибка при удалении уведомления" },
      { status: 500 }
    )
  }
}

