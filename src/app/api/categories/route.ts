import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireModerator } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { z } from "zod"

const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  orderIndex: z.number().int().min(0).default(0),
})

/**
 * GET /api/categories
 * Get all categories
 */
export async function GET(_request: NextRequest) {
  try {
    await requireAuth()

    const categories = await db.category.findMany({
      include: {
        _count: {
          select: {
            courses: true,
          },
        },
      },
      orderBy: {
        orderIndex: "asc",
      },
    })

    const categoriesWithCount = categories.map((cat) => ({
      ...cat,
      coursesCount: cat._count.courses,
    }))

    return NextResponse.json({ categories: categoriesWithCount })
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json(
      { error: "Ошибка при получении категорий" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/categories
 * Create a new category (Moderator+ only)
 */
export async function POST(request: NextRequest) {
  try {
    await requireModerator()
    const body = await request.json()
    const data = categorySchema.parse(body)

    const existing = await db.category.findUnique({
      where: { slug: data.slug },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Категория с таким slug уже существует" },
        { status: 400 }
      )
    }

    const category = await db.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        orderIndex: data.orderIndex,
      },
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверные данные", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating category:", error)
    return NextResponse.json(
      { error: "Ошибка при создании категории" },
      { status: 500 }
    )
  }
}
