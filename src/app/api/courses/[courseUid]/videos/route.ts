import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import * as z from "zod"

const createVideoSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  videoUrl: z.string().url(),
  duration: z.number().int().positive().optional(),
  orderIndex: z.number().int().min(0).default(0),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseUid: string }> | { courseUid: string } }
) {
  try {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })
    }

    const resolvedParams = await Promise.resolve(params)
    const body = await req.json()
    const data = createVideoSchema.parse(body)

    // Проверяем, что курс существует и принадлежит администратору
    const course = await db.course.findUnique({
      where: { courseUid: resolvedParams.courseUid },
    })

    if (!course) {
      return NextResponse.json({ error: "Курс не найден" }, { status: 404 })
    }

    const lesson = await db.lesson.create({
      data: {
        title: data.title,
        description: data.description,
        videoUrl: data.videoUrl,
        duration: data.duration,
        orderIndex: data.orderIndex,
        courseUid: resolvedParams.courseUid,
        isFree: false,
      },
    })

    const video = {
      videoUid: lesson.lessonUid,
      title: lesson.title,
      description: lesson.description,
      videoUrl: lesson.videoUrl || "",
      duration: lesson.duration,
      orderIndex: lesson.orderIndex,
      courseUid: lesson.courseUid,
      createdAt: lesson.createdAt,
    }

    return NextResponse.json({ video }, { status: 201 })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные", details: error.issues }, { status: 400 })
    }

    return NextResponse.json({ error: "Произошла ошибка при создании видео" }, { status: 500 })
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseUid: string }> | { courseUid: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)

    const lessons = await db.lesson.findMany({
      where: {
        courseUid: resolvedParams.courseUid,
        videoUrl: { not: null },
      },
      orderBy: {
        orderIndex: "asc",
      },
    })

    const videos = lessons.map((lesson) => ({
      videoUid: lesson.lessonUid,
      title: lesson.title,
      description: lesson.description,
      videoUrl: lesson.videoUrl || "",
      duration: lesson.duration,
      orderIndex: lesson.orderIndex,
      courseUid: lesson.courseUid,
      createdAt: lesson.createdAt,
    }))

    return NextResponse.json({ videos })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Произошла ошибка при получении видео" }, { status: 500 })
  }
}
