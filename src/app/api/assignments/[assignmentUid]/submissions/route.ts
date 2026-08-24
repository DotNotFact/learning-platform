import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth, requireTeacher } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { canEditCourse } from "@/lib/rbac"
import type { UserRole } from "@/types"

const submitSchema = z.object({
  content: z.string().min(1, "Ответ не может быть пустым").max(20000),
})

/**
 * GET /api/assignments/[assignmentUid]/submissions
 * Teacher-only: list submissions for assignment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentUid: string }> | { assignmentUid: string } }
) {
  try {
    await requireTeacher()
    const session = await requireAuth()
    const userUid = session.user.id
    const role = session.user.role as UserRole
    const resolvedParams = await Promise.resolve(params)

    const assignment = await db.assignment.findUnique({
      where: { assignmentUid: resolvedParams.assignmentUid },
      include: {
        lesson: { include: { course: { select: { authorUid: true, courseUid: true } } } },
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Задание не найдено" }, { status: 404 })
    }

    const course = assignment.lesson?.course
    if (course && !canEditCourse(role, course.authorUid, userUid)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })
    }

    const submissions = await db.assignmentSubmission.findMany({
      where: { assignmentUid: resolvedParams.assignmentUid },
      include: {
        user: { select: { userUid: true, name: true, email: true } },
      },
      orderBy: { submittedAt: "desc" },
    })

    return NextResponse.json({ submissions })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверные данные", details: error.issues },
        { status: 400 }
      )
    }
    console.error("Error fetching submissions:", error)
    return NextResponse.json(
      { error: "Ошибка при получении сдач" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/assignments/[assignmentUid]/submissions
 * Student submits assignment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentUid: string }> | { assignmentUid: string } }
) {
  try {
    const session = await requireAuth()
    const userUid = session.user.id
    const resolvedParams = await Promise.resolve(params)

    const body = await request.json()
    const data = submitSchema.parse(body)

    const assignment = await db.assignment.findUnique({
      where: { assignmentUid: resolvedParams.assignmentUid },
      include: {
        lesson: { select: { courseUid: true } },
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Задание не найдено" }, { status: 404 })
    }

    if (!assignment.lesson?.courseUid) {
      return NextResponse.json(
        { error: "Это задание не привязано к курсу" },
        { status: 400 }
      )
    }

    // Must be enrolled
    const enrollment = await db.enrollment.findUnique({
      where: {
        userUid_courseUid: { userUid, courseUid: assignment.lesson.courseUid },
      },
      select: { enrollmentUid: true },
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: "Вы не записаны на этот курс" },
        { status: 403 }
      )
    }

    // One submission per user (app-level rule)
    const existing = await db.assignmentSubmission.findFirst({
      where: { assignmentUid: assignment.assignmentUid, userUid },
      select: { submissionUid: true },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Вы уже отправили это задание" },
        { status: 400 }
      )
    }

    const submission = await db.assignmentSubmission.create({
      data: {
        assignmentUid: assignment.assignmentUid,
        userUid,
        content: data.content,
      },
      include: {
        assignment: {
          select: {
            assignmentUid: true,
            title: true,
            maxScore: true,
            lesson: {
              select: {
                courseUid: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ submission }, { status: 201 })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверные данные", details: error.issues },
        { status: 400 }
      )
    }
    console.error("Error submitting assignment:", error)
    return NextResponse.json(
      { error: "Ошибка при отправке задания" },
      { status: 500 }
    )
  }
}
