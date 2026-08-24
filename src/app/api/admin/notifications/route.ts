import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireManager } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import type { NotificationType } from "@/types/notification"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  // either a specific user, or broadcast=true
  userUid: z.string().uuid().optional().nullable(),
  broadcast: z.boolean().optional().default(false),
  type: z.custom<NotificationType>().optional().default("SYSTEM"),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  link: z.string().max(500).optional().nullable(),
})

/**
 * GET /api/admin/notifications
 * Query:
 * - userUid (optional)
 * - isRead: "all" | "true" | "false" (default "all")
 * - type (optional)
 * - limit (default 100, max 500)
 */
export async function GET(request: NextRequest) {
  try {
    await requireManager()
    const { searchParams } = new URL(request.url)

    const userUid = searchParams.get("userUid") || undefined
    const isReadParam = searchParams.get("isRead") || "all"
    const type = searchParams.get("type") || undefined
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10) || 100, 500)

    const where: Prisma.NotificationWhereInput = {}
    if (userUid) where.userUid = userUid
    if (type) where.type = type
    if (isReadParam === "true") where.isRead = true
    if (isReadParam === "false") where.isRead = false

    const notifications = await db.notification.findMany({
      where,
      include: {
        user: { select: { userUid: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error("Error fetching admin notifications:", error)
    return NextResponse.json(
      { error: "Ошибка при получении уведомлений" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/notifications
 * Create a system notification (MANAGER+)
 * - broadcast=true -> send to all active users
 * - else userUid required
 */
export async function POST(request: NextRequest) {
  try {
    await requireManager()
    const body = await request.json()
    const data = createSchema.parse(body)

    if (!data.broadcast && !data.userUid) {
      return NextResponse.json(
        { error: "userUid обязателен, если broadcast=false" },
        { status: 400 }
      )
    }

    if (data.broadcast) {
      const users = await db.user.findMany({
        where: { isActive: true },
        select: { userUid: true },
      })

      if (users.length === 0) {
        return NextResponse.json({ created: 0 })
      }

      await db.notification.createMany({
        data: users.map((u) => ({
          userUid: u.userUid,
          type: data.type,
          title: data.title,
          message: data.message,
          link: data.link || null,
          isRead: false,
        })),
      })

      return NextResponse.json({ created: users.length }, { status: 201 })
    }

    const notification = await db.notification.create({
      data: {
        userUid: data.userUid!,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link || null,
      },
      include: {
        user: { select: { userUid: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ notification }, { status: 201 })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверные данные", details: error.issues },
        { status: 400 }
      )
    }
    console.error("Error creating admin notification:", error)
    return NextResponse.json(
      { error: "Ошибка при создании уведомления" },
      { status: 500 }
    )
  }
}
