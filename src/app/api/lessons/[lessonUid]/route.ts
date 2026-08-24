import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireTeacher } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { canEditCourse } from "@/lib/rbac"
import { z } from "zod"

const updateLessonSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal("")),
  duration: z.number().int().min(0).optional(),
  orderIndex: z.number().int().min(0).optional(),
  isFree: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonUid: string }> }
) {
  try {
    const session = await requireAuth()
    const { lessonUid } = await params

    const lesson = await db.lesson.findUnique({
      where: { lessonUid },
      include: {
        course: {
          select: {
            courseUid: true,
            title: true,
            isPublished: true,
            authorUid: true,
          },
        },
      },
    })

    if (!lesson) {
      return NextResponse.json(
        { error: "Урок не найден" },
        { status: 404 }
      )
    }

    const enrollment = await db.enrollment.findUnique({
      where: {
        userUid_courseUid: {
          userUid: session.user.id,
          courseUid: lesson.courseUid,
        },
      },
    })

    const canView =
      lesson.course.isPublished ||
      canEditCourse(
        session.user.role,
        lesson.course.authorUid,
        session.user.id
      ) ||
      enrollment !== null

    if (!canView) {
      return NextResponse.json(
        { error: "Доступ запрещен" },
        { status: 403 }
      )
    }

    const progress = enrollment
      ? await db.progress.findUnique({
          where: {
            userUid_lessonUid: {
              userUid: session.user.id,
              lessonUid,
            },
          },
        })
      : null

    return NextResponse.json({
      lesson: {
        ...lesson,
        progress,
      },
    })
  } catch (error) {
    console.error("Error fetching lesson:", error)
    return NextResponse.json(
      { error: "Ошибка при получении урока" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/lessons/[lessonUid]
 * Update lesson
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ lessonUid: string }> }
) {
  try {
    await requireTeacher()
    const { lessonUid } = await params
    const body = await request.json()
    const data = updateLessonSchema.parse(body)

    const lesson = await db.lesson.findUnique({
      where: { lessonUid },
      include: {
        course: {
          select: {
            authorUid: true,
          },
        },
      },
    })

    if (!lesson) {
      return NextResponse.json(
        { error: "Урок не найден" },
        { status: 404 }
      )
    }

    const session = await requireAuth()
    if (
      !canEditCourse(
        session.user.role,
        lesson.course.authorUid,
        session.user.id
      )
    ) {
      return NextResponse.json(
        { error: "Недостаточно прав" },
        { status: 403 }
      )
    }

    const updated = await db.lesson.update({
      where: { lessonUid },
      data: {
        title: data.title,
        description: data.description,
        content: data.content,
        videoUrl: data.videoUrl !== undefined ? (data.videoUrl || null) : undefined,
        duration: data.duration,
        orderIndex: data.orderIndex,
        isFree: data.isFree,
      },
    })

    return NextResponse.json({ lesson: updated })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверные данные", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating lesson:", error)
    return NextResponse.json(
      { error: "Ошибка при обновлении урока" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/lessons/[lessonUid]
 * Delete lesson
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ lessonUid: string }> }
) {
  try {
    await requireTeacher()
    const { lessonUid } = await params

    const lesson = await db.lesson.findUnique({
      where: { lessonUid },
      include: {
        course: {
          select: {
            authorUid: true,
          },
        },
      },
    })

    if (!lesson) {
      return NextResponse.json(
        { error: "Урок не найден" },
        { status: 404 }
      )
    }

    const session = await requireAuth()
    if (
      !canEditCourse(
        session.user.role,
        lesson.course.authorUid,
        session.user.id
      )
    ) {
      return NextResponse.json(
        { error: "Недостаточно прав" },
        { status: 403 }
      )
    }

    await db.lesson.delete({
      where: { lessonUid },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting lesson:", error)
    return NextResponse.json(
      { error: "Ошибка при удалении урока" },
      { status: 500 }
    )
  }
}
