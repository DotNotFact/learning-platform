import { NextResponse } from "next/server"
import { requireAuth, requireTeacher } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import * as z from "zod"

export const dynamic = "force-dynamic"

const createCourseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  categoryUid: z.string().uuid().optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  estimatedHours: z.number().int().min(0).optional(),
  price: z.number().min(0).optional(),
  isPublished: z.boolean().default(false),
  orderIndex: z.number().int().min(0).default(0),
})

export async function POST(req: Request) {
  try {
    await requireTeacher()
    const session = await requireAuth()

    const body = await req.json()
    const data = createCourseSchema.parse(body)

    const course = await db.course.create({
      data: {
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl || null,
        categoryUid: data.categoryUid || null,
        difficulty: data.difficulty || null,
        estimatedHours: data.estimatedHours || null,
        price: data.price || null,
        isPublished: data.isPublished,
        orderIndex: data.orderIndex,
        authorUid: session.user.id,
      },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        category: true,
        lessons: {
          orderBy: {
            orderIndex: "asc",
          },
        },
        quizzes: {
          include: {
            questions: {
              orderBy: {
                orderIndex: "asc",
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ course }, { status: 201 })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные", details: error.issues }, { status: 400 })
    }

    return NextResponse.json({ error: "Произошла ошибка при создании курса" }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    await requireAuth()
    const { searchParams } = new URL(req.url)
    const published = searchParams.get("published") // "true" | "false" | "all"
    const q = (searchParams.get("q") || "").trim()
    const categoryUid = (searchParams.get("categoryUid") || "").trim()
    const difficulty = (searchParams.get("difficulty") || "").trim()
    const minPrice = searchParams.get("minPrice")
    const maxPrice = searchParams.get("maxPrice")
    const tagUids = searchParams.getAll("tagUid").filter(Boolean)
    const sort = (searchParams.get("sort") || "order").trim()
    const page = Math.max(Number(searchParams.get("page") || 1), 1)
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 12), 1), 60)

    const where = {
      ...(published === "true"
        ? { isPublished: true }
        : published === "false"
          ? { isPublished: false }
          : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : {}),
      ...(categoryUid ? { categoryUid } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(minPrice || maxPrice
        ? {
            price: {
              ...(minPrice ? { gte: Number(minPrice) } : {}),
              ...(maxPrice ? { lte: Number(maxPrice) } : {}),
            },
          }
        : {}),
      ...(tagUids.length > 0
        ? {
            tags: {
              some: {
                tagUid: { in: tagUids },
              },
            },
          }
        : {}),
    } as const

    const orderBy =
      sort === "newest"
        ? [{ createdAt: "desc" as const }]
        : sort === "price_asc"
          ? [{ price: "asc" as const }]
          : sort === "price_desc"
            ? [{ price: "desc" as const }]
            : sort === "title"
              ? [{ title: "asc" as const }]
              : [{ orderIndex: "asc" as const }]

    const [total, courses] = await Promise.all([
      db.course.count({ where }),
      db.course.findMany({
        where,
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
        lessons: {
          orderBy: {
            orderIndex: "asc",
          },
        },
        quizzes: {
          include: {
            questions: {
              orderBy: {
                orderIndex: "asc",
              },
            },
          },
        },
      },
        orderBy,
        take: limit,
        skip: (page - 1) * limit,
      }),
    ])

    const totalPages = Math.max(Math.ceil(total / limit), 1)
    return NextResponse.json({
      courses,
      pagination: { page, limit, total, totalPages },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Произошла ошибка при получении курсов" }, { status: 500 })
  }
}
