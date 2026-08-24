import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth, requireTeacher } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { canEditCourse } from "@/lib/rbac"
import type { UserRole } from "@/types"

const gradeSchema = z.object({
  score: z.number().int().min(0).optional().nullable(),
  feedback: z.string().max(5000).optional().nullable(),
})

/**
 * PATCH /api/submissions/[submissionUid]
 * Teacher grades a submission
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ submissionUid: string }> | { submissionUid: string } }
) {
  try {
    await requireTeacher()
    const session = await requireAuth()
    const teacherUid = session.user.id
    const role = session.user.role as UserRole
    const resolvedParams = await Promise.resolve(params)

    const body = await request.json()
    const data = gradeSchema.parse(body)

    const submission = await db.assignmentSubmission.findUnique({
      where: { submissionUid: resolvedParams.submissionUid },
      include: {
        assignment: {
          include: {
            lesson: {
              include: {
                course: {
                  select: { authorUid: true, courseUid: true, title: true },
                },
              },
            },
          },
        },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "Сдача не найдена" }, { status: 404 })
    }

    const course = submission.assignment.lesson?.course
    if (course && !canEditCourse(role, course.authorUid, teacherUid)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })
    }

    const maxScore = submission.assignment.maxScore
    if (data.score !== undefined && data.score !== null && data.score > maxScore) {
      return NextResponse.json(
        { error: `Оценка не может быть больше ${maxScore}` },
        { status: 400 }
      )
    }

    const updated = await db.assignmentSubmission.update({
      where: { submissionUid: resolvedParams.submissionUid },
      data: {
        score: data.score ?? null,
        feedback: data.feedback ?? null,
        gradedAt: new Date(),
      },
    })

    // Notify student
    if (course?.courseUid) {
      const { notifyAssignmentGraded } = await import("@/lib/notifications")
      await notifyAssignmentGraded(
        submission.userUid,
        submission.assignment.title,
        course.courseUid,
        updated.score,
        maxScore
      )
    }

    return NextResponse.json({ submission: updated })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверные данные", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error grading submission:", error)
    return NextResponse.json(
      { error: "Ошибка при проверке задания" },
      { status: 500 }
    )
  }
}

