import { NextRequest, NextResponse } from "next/server"
import { requireTeacher } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { z } from "zod"

const lessonSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  content: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal("")),
  duration: z.number().int().min(0).optional(),
  orderIndex: z.number().int().min(0).default(0),
  isFree: z.boolean().default(false),
  courseUid: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    await requireTeacher()
    const body = await request.json()
    const data = lessonSchema.parse(body)

    const course = await db.course.findUnique({
      where: { courseUid: data.courseUid },
    })

    if (!course) {
      return NextResponse.json(
        { error: "Курс не найден" },
        { status: 404 }
      )
    }

    const lesson = await db.lesson.create({
      data: {
        title: data.title,
        description: data.description,
        content: data.content,
        videoUrl: data.videoUrl || null,
        duration: data.duration,
        orderIndex: data.orderIndex,
        isFree: data.isFree,
        courseUid: data.courseUid,
      },
    })

    return NextResponse.json({ lesson }, { status: 201 })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверные данные", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating lesson:", error)
    return NextResponse.json(
      { error: "Ошибка при создании урока" },
      { status: 500 }
    )
  }
}
