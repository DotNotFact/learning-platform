import { NextRequest, NextResponse } from "next/server"
import { requireModerator } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/comments
 * Query:
 * - approved: "all" | "true" | "false" (default "all")
 * - limit: number (default 50)
 * - courseUid: uuid (optional)
 */
export async function GET(request: NextRequest) {
  try {
    await requireModerator()
    const { searchParams } = new URL(request.url)
    const approved = searchParams.get("approved") || "all"
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10) || 50, 200)
    const courseUid = searchParams.get("courseUid")

    const where: Prisma.CommentWhereInput = {}
    if (courseUid) where.courseUid = courseUid
    if (approved === "true") where.isApproved = true
    if (approved === "false") where.isApproved = false

    const comments = await db.comment.findMany({
      where,
      include: {
        user: { select: { userUid: true, name: true, email: true } },
        course: { select: { courseUid: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    return NextResponse.json({ comments })
  } catch (error) {
    console.error("Error fetching admin comments:", error)
    return NextResponse.json({ error: "Ошибка при получении комментариев" }, { status: 500 })
  }
}
