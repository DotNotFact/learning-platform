import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { canEditCourse, hasRole, ROLES } from "@/lib/rbac"
import type { UserRole } from "@/types"

/**
 * GET /api/assignments/[assignmentUid]
 * Get assignment details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentUid: string }> | { assignmentUid: string } }
) {
  try {
    const session = await requireAuth()
    const userUid = session.user.id
    const role = session.user.role as UserRole
    const resolvedParams = await Promise.resolve(params)

    const assignment = await db.assignment.findUnique({
      where: { assignmentUid: resolvedParams.assignmentUid },
      include: {
        lesson: {
          select: {
            lessonUid: true,
            title: true,
            courseUid: true,
            course: {
              select: {
                courseUid: true,
                title: true,
                authorUid: true,
              },
            },
          },
        },
        submissions: hasRole(role, ROLES.TEACHER)
          ? {
              include: {
                user: { select: { userUid: true, name: true, email: true } },
              },
              orderBy: { submittedAt: "desc" },
            }
          : {
              where: { userUid },
              orderBy: { submittedAt: "desc" },
              take: 1,
            },
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Задание не найдено" }, { status: 404 })
    }

    // If teacher, ensure they can access related course (if any)
    if (hasRole(role, ROLES.TEACHER) && assignment.lesson?.course) {
      if (!canEditCourse(role, assignment.lesson.course.authorUid, userUid)) {
        return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })
      }
    }

    // If student, ensure enrolled when assignment is tied to a course
    if (!hasRole(role, ROLES.TEACHER) && assignment.lesson?.courseUid) {
      const enrollment = await db.enrollment.findUnique({
        where: {
          userUid_courseUid: { userUid, courseUid: assignment.lesson.courseUid },
        },
        select: { enrollmentUid: true },
      })

      if (!enrollment) {
        return NextResponse.json({ error: "Нет доступа к заданию" }, { status: 403 })
      }
    }

    return NextResponse.json({ assignment })
  } catch (error) {
    console.error("Error fetching assignment:", error)
    return NextResponse.json(
      { error: "Ошибка при получении задания" },
      { status: 500 }
    )
  }
}
