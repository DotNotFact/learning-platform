import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth, requireModerator } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
})

/**
 * GET /api/tags
 * Query:
 * - q: string (optional) search in name/slug
 * - limit: number (default 200)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get("q") || "").trim()
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 200), 1), 500)

    const tags = await db.tag.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q } },
              { slug: { contains: q } },
            ],
          }
        : undefined,
      include: { _count: { select: { courses: true } } },
      orderBy: [{ name: "asc" }],
      take: limit,
    })

    return NextResponse.json({
      tags: tags.map((t) => ({ ...t, coursesCount: t._count.courses })),
    })
  } catch (error) {
    console.error("Error fetching tags:", error)
    return NextResponse.json({ error: "Ошибка при получении тегов" }, { status: 500 })
  }
}

/**
 * POST /api/tags
 * Create tag (MODERATOR+)
 */
export async function POST(request: NextRequest) {
  try {
    await requireModerator()
    const body = await request.json()
    const data = createSchema.parse(body)

    const slug = data.slug.trim()
    const name = data.name.trim()

    const existingSlug = await db.tag.findUnique({ where: { slug } })
    if (existingSlug) {
      return NextResponse.json({ error: "Тег с таким slug уже существует" }, { status: 400 })
    }
    const existingName = await db.tag.findUnique({ where: { name } })
    if (existingName) {
      return NextResponse.json({ error: "Тег с таким названием уже существует" }, { status: 400 })
    }

    const tag = await db.tag.create({
      data: { name, slug },
    })

    return NextResponse.json({ tag }, { status: 201 })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные", details: error.issues }, { status: 400 })
    }
    console.error("Error creating tag:", error)
    return NextResponse.json({ error: "Ошибка при создании тега" }, { status: 500 })
  }
}

