import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import * as z from "zod"

const updateVideoSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  videoUrl: z.string().url().optional(),
  duration: z.number().int().positive().optional(),
  orderIndex: z.number().int().min(0).optional(),
})

export async function GET(
  req: Request,
  { params }: { params: Promise<{ videoUid: string }> | { videoUid: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const lesson = await db.lesson.findUnique({
      where: {
        lessonUid: resolvedParams.videoUid,
      },
      include: {
        course: {
          select: {
            courseUid: true,
            title: true,
          },
        },
      },
    })

    if (!lesson || !lesson.videoUrl) {
      return NextResponse.json({ error: "Видео не найдено" }, { status: 404 })
    }

    const video = {
      videoUid: lesson.lessonUid,
      title: lesson.title,
      description: lesson.description,
      videoUrl: lesson.videoUrl,
      duration: lesson.duration,
      orderIndex: lesson.orderIndex,
      courseUid: lesson.courseUid,
      createdAt: lesson.createdAt,
      course: lesson.course,
    }

    return NextResponse.json({ video })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Произошла ошибка при получении видео" }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ videoUid: string }> | { videoUid: string } }
) {
  try {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })
    }

    const resolvedParams = await Promise.resolve(params)
    const body = await req.json()
    const data = updateVideoSchema.parse(body)

    const lesson = await db.lesson.update({
      where: {
        lessonUid: resolvedParams.videoUid,
      },
      data: {
        title: data.title,
        description: data.description,
        videoUrl: data.videoUrl,
        duration: data.duration,
        orderIndex: data.orderIndex,
      },
    })

    const video = {
      videoUid: lesson.lessonUid,
      title: lesson.title,
      description: lesson.description,
      videoUrl: lesson.videoUrl,
      duration: lesson.duration,
      orderIndex: lesson.orderIndex,
      courseUid: lesson.courseUid,
      createdAt: lesson.createdAt,
    }

    return NextResponse.json({ video })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные", details: error.issues }, { status: 400 })
    }

    return NextResponse.json({ error: "Произошла ошибка при обновлении видео" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ videoUid: string }> | { videoUid: string } }
) {
  try {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })
    }

    const resolvedParams = await Promise.resolve(params)
    await db.lesson.delete({
      where: {
        lessonUid: resolvedParams.videoUid,
      },
    })

    return NextResponse.json({ message: "Видео удалено" })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Произошла ошибка при удалении видео" }, { status: 500 })
  }
}
