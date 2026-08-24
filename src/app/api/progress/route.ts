import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { getCourseProgressSummary, syncEnrollmentProgress } from "@/lib/course-progress"
import { z } from "zod"

const progressSchema = z.object({
  lessonUid: z.string().uuid(),
  watchedSeconds: z.number().int().min(0).optional(),
  completed: z.boolean().optional(),
})

/**
 * GET /api/progress
 * Get user's progress for a course or all courses
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userUid = session.user.id
    const { searchParams } = new URL(request.url)
    const courseUid = searchParams.get("courseUid")

    if (courseUid) {
      const lessons = await db.lesson.findMany({
        where: { courseUid },
        select: {
          lessonUid: true,
          title: true,
          duration: true,
        },
      })

      const progress = await db.progress.findMany({
        where: {
          userUid,
          lessonUid: {
            in: lessons.map((l) => l.lessonUid),
          },
        },
      })

      const summary = await getCourseProgressSummary(userUid, courseUid)
      const progressMap = new Map(
        progress.map((p) => [p.lessonUid, p])
      )

      const courseProgress = {
        courseUid,
        totalLessons: lessons.length,
        completedLessons: progress.filter((p) => p.completed).length,
        totalQuizzes: summary.totalQuizzes,
        passedQuizzes: summary.passedQuizzes,
        progress: summary.progressPercentage,
        lessons: lessons.map((lesson) => ({
          ...lesson,
          progress: progressMap.get(lesson.lessonUid) || null,
        })),
      }

      return NextResponse.json({ progress: courseProgress })
    }

    const allProgress = await db.progress.findMany({
      where: { userUid },
      include: {
        lesson: {
          select: {
            lessonUid: true,
            title: true,
            courseUid: true,
            duration: true,
          },
        },
      },
    })

    return NextResponse.json({ progress: allProgress })
  } catch (error) {
    console.error("Error fetching progress:", error)
    return NextResponse.json(
      { error: "Ошибка при получении прогресса" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/progress
 * Update or create progress for a lesson
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userUid = session.user.id

    const body = await request.json()
    const { lessonUid, watchedSeconds, completed } = progressSchema.parse(body)

    const lesson = await db.lesson.findUnique({
      where: { lessonUid },
    })

    if (!lesson) {
      return NextResponse.json(
        { error: "Урок не найден" },
        { status: 404 }
      )
    }

    // Чтобы watchedSeconds не "откатывался" из-за перемотки
    // берём max(existing, incoming)
    const existing = await db.progress.findUnique({
      where: {
        userUid_lessonUid: { userUid, lessonUid },
      },
      select: {
        watchedSeconds: true,
        completed: true,
      },
    })

    const watchedSecondsToSave =
      watchedSeconds === undefined
        ? undefined
        : Math.max(existing?.watchedSeconds ?? 0, watchedSeconds)

    const completedToSave =
      completed === undefined ? undefined : (existing?.completed ?? false) || completed

    const progress = await db.progress.upsert({
      where: {
        userUid_lessonUid: {
          userUid,
          lessonUid,
        },
      },
      update: {
        watchedSeconds: watchedSecondsToSave,
        completed: completedToSave,
        lastWatchedAt: new Date(),
        completedAt: completedToSave ? new Date() : undefined,
      },
      create: {
        userUid,
        lessonUid,
        watchedSeconds: watchedSeconds ?? 0,
        completed: completed ?? false,
        lastWatchedAt: new Date(),
        completedAt: completed ? new Date() : undefined,
      },
    })

    // Если урок завершен, обновляем прогресс курса и проверяем сертификат
    if (completedToSave && progress.completed) {
      const summary = await syncEnrollmentProgress(userUid, lesson.courseUid)

      // Если прогресс 100%, проверяем, нужно ли выдать сертификат
      if (summary?.isCompleted) {
        const { checkAndIssueCertificate } = await import("@/lib/certificates")
        await checkAndIssueCertificate(userUid, lesson.courseUid)
      }
    }

    return NextResponse.json({ progress })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверные данные", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating progress:", error)
    return NextResponse.json(
      { error: "Ошибка при обновлении прогресса" },
      { status: 500 }
    )
  }
}
