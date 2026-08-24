import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

/**
 * DELETE /api/enrollments/[courseUid]
 * Unenroll from a course
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseUid: string }> }
) {
  try {
    const session = await requireAuth()
    const userUid = session.user.id
    const { courseUid } = await params

    const enrollment = await db.enrollment.findUnique({
      where: {
        userUid_courseUid: {
          userUid,
          courseUid,
        },
      },
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: "Запись не найдена" },
        { status: 404 }
      )
    }

    await db.enrollment.delete({
      where: {
        enrollmentUid: enrollment.enrollmentUid,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting enrollment:", error)
    return NextResponse.json(
      { error: "Ошибка при отмене записи на курс" },
      { status: 500 }
    )
  }
}
