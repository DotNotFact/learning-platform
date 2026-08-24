import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireModerator } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(2000).optional().nullable(),
  orderIndex: z.number().int().min(0).optional(),
})

/**
 * PATCH /api/categories/[categoryUid]
 * Update category (MODERATOR+)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ categoryUid: string }> | { categoryUid: string } }
) {
  try {
    await requireModerator()
    const { categoryUid } = await Promise.resolve(params)
    const body = await request.json()
    const data = updateSchema.parse(body)

    const existing = await db.category.findUnique({ where: { categoryUid } })
    if (!existing) {
      return NextResponse.json({ error: "Категория не найдена" }, { status: 404 })
    }

    if (data.slug && data.slug !== existing.slug) {
      const conflict = await db.category.findUnique({ where: { slug: data.slug } })
      if (conflict) {
        return NextResponse.json(
          { error: "Категория с таким slug уже существует" },
          { status: 400 }
        )
      }
    }

    const updated = await db.category.update({
      where: { categoryUid },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        orderIndex: data.orderIndex,
      },
      include: {
        _count: { select: { courses: true } },
      },
    })

    return NextResponse.json({
      category: { ...updated, coursesCount: updated._count.courses },
    })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверные данные", details: error.issues },
        { status: 400 }
      )
    }
    console.error("Error updating category:", error)
    return NextResponse.json({ error: "Ошибка при обновлении категории" }, { status: 500 })
  }
}

/**
 * DELETE /api/categories/[categoryUid]
 * Delete category (MODERATOR+). Reject if category has courses.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ categoryUid: string }> | { categoryUid: string } }
) {
  try {
    await requireModerator()
    const { categoryUid } = await Promise.resolve(params)

    const existing = await db.category.findUnique({
      where: { categoryUid },
      include: { _count: { select: { courses: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: "Категория не найдена" }, { status: 404 })
    }
    if (existing._count.courses > 0) {
      return NextResponse.json(
        { error: "Нельзя удалить категорию, в которой есть курсы" },
        { status: 400 }
      )
    }

    await db.category.delete({ where: { categoryUid } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json({ error: "Ошибка при удалении категории" }, { status: 500 })
  }
}

