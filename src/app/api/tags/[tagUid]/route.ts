import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireModerator } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/).optional(),
})

/**
 * PATCH /api/tags/[tagUid]
 * Update tag (MODERATOR+)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tagUid: string }> | { tagUid: string } }
) {
  try {
    await requireModerator()
    const { tagUid } = await Promise.resolve(params)
    const body = await request.json()
    const data = updateSchema.parse(body)

    const existing = await db.tag.findUnique({ where: { tagUid } })
    if (!existing) {
      return NextResponse.json({ error: "Тег не найден" }, { status: 404 })
    }

    if (data.slug && data.slug !== existing.slug) {
      const conflict = await db.tag.findUnique({ where: { slug: data.slug } })
      if (conflict) {
        return NextResponse.json({ error: "Тег с таким slug уже существует" }, { status: 400 })
      }
    }
    if (data.name && data.name !== existing.name) {
      const conflict = await db.tag.findUnique({ where: { name: data.name } })
      if (conflict) {
        return NextResponse.json({ error: "Тег с таким названием уже существует" }, { status: 400 })
      }
    }

    const updated = await db.tag.update({
      where: { tagUid },
      data: {
        name: data.name ? data.name.trim() : undefined,
        slug: data.slug ? data.slug.trim() : undefined,
      },
      include: { _count: { select: { courses: true } } },
    })

    return NextResponse.json({
      tag: { ...updated, coursesCount: updated._count.courses },
    })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные", details: error.issues }, { status: 400 })
    }
    console.error("Error updating tag:", error)
    return NextResponse.json({ error: "Ошибка при обновлении тега" }, { status: 500 })
  }
}

/**
 * DELETE /api/tags/[tagUid]
 * Delete tag (MODERATOR+). Reject if used by any course.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tagUid: string }> | { tagUid: string } }
) {
  try {
    await requireModerator()
    const { tagUid } = await Promise.resolve(params)

    const existing = await db.tag.findUnique({
      where: { tagUid },
      include: { _count: { select: { courses: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: "Тег не найден" }, { status: 404 })
    }
    if (existing._count.courses > 0) {
      return NextResponse.json(
        { error: "Нельзя удалить тег, который используется в курсах" },
        { status: 400 }
      )
    }

    await db.tag.delete({ where: { tagUid } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting tag:", error)
    return NextResponse.json({ error: "Ошибка при удалении тега" }, { status: 500 })
  }
}

