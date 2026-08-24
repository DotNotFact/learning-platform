import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth, requireTeacher } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { canEditCourse, hasRole, ROLES } from "@/lib/rbac"
import type { UserRole } from "@/types"

const assignmentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  instructions: z.string().max(20000).optional().nullable(),
  videoUrl: z.string().url().optional().nullable().or(z.literal("")),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
  resourceUrl: z.string().url().optional().nullable().or(z.literal("")),
  meetingUrl: z.string().url().optional().nullable().or(z.literal("")),
  dueDate: z
    .preprocess((v) => (v ? new Date(String(v)) : null), z.date().nullable())
    .optional(),
  maxScore: z.number().int().min(1).max(1000).default(100),
  lessonUid: z.string().uuid().optional().nullable(),
  quizUid: z.string().uuid().optional().nullable(),
})

/**
 * GET /api/assignments
 * - Teachers+: ?mine=true -> assignments created by me
 * - Students: assignments for lessons in enrolled courses
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userUid = session.user.id
    const role = session.user.role as UserRole

    const { searchParams } = new URL(request.url)
    const mine = searchParams.get("mine") === "true"

    if (mine && hasRole(role, ROLES.TEACHER)) {
      const assignments = await db.assignment.findMany({
        where: { authorUid: userUid },
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
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      })

      return NextResponse.json({ assignments })
    }

    // Student view: assignments for enrolled courses
    const enrollments = await db.enrollment.findMany({
      where: { userUid },
      select: { courseUid: true },
    })

    const courseUids = enrollments.map((e) => e.courseUid)
    if (courseUids.length === 0) {
      return NextResponse.json({ assignments: [] })
    }

    const lessons = await db.lesson.findMany({
      where: { courseUid: { in: courseUids } },
      select: { lessonUid: true },
    })

    const lessonUids = lessons.map((l) => l.lessonUid)
    if (lessonUids.length === 0) {
      return NextResponse.json({ assignments: [] })
    }

    const assignments = await db.assignment.findMany({
      where: { lessonUid: { in: lessonUids } },
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
        submissions: {
          where: { userUid },
          orderBy: { submittedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error("Error fetching assignments:", error)
    return NextResponse.json(
      { error: "Ошибка при получении заданий" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/assignments
 * Create assignment (TEACHER+). If lessonUid is provided, checks course ownership.
 */
export async function POST(request: NextRequest) {
  try {
    await requireTeacher()
    const session = await requireAuth()
    const userUid = session.user.id
    const role = session.user.role as UserRole

    const body = await request.json()
    const data = assignmentSchema.parse(body)

    const lessonUid: string | null = data.lessonUid ?? null
    const quizUid: string | null = data.quizUid ?? null

    if (lessonUid) {
      const lesson = await db.lesson.findUnique({
        where: { lessonUid },
        select: {
          lessonUid: true,
          course: { select: { courseUid: true, authorUid: true, title: true } },
        },
      })

      if (!lesson) {
        return NextResponse.json({ error: "Урок не найден" }, { status: 404 })
      }

      if (!canEditCourse(role, lesson.course.authorUid, userUid)) {
        return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })
      }
    }

    if (quizUid) {
      const quiz = await db.quiz.findUnique({
        where: { quizUid },
        select: {
          quizUid: true,
          course: { select: { courseUid: true, authorUid: true, title: true } },
        },
      })

      if (!quiz) {
        return NextResponse.json({ error: "Тест не найден" }, { status: 404 })
      }

      if (!canEditCourse(role, quiz.course.authorUid, userUid)) {
        return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })
      }
    }

    const assignment = await db.assignment.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        instructions: data.instructions ?? null,
        dueDate: data.dueDate ?? null,
        maxScore: data.maxScore,
        lessonUid,
        quizUid,
        videoUrl: data.videoUrl === "" ? null : data.videoUrl ?? null,
        imageUrl: data.imageUrl === "" ? null : data.imageUrl ?? null,
        resourceUrl: data.resourceUrl === "" ? null : data.resourceUrl ?? null,
        meetingUrl: data.meetingUrl === "" ? null : data.meetingUrl ?? null,
        authorUid: userUid,
      },
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
      },
    })

    return NextResponse.json({ assignment }, { status: 201 })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверные данные", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating assignment:", error)
    return NextResponse.json(
      { error: "Ошибка при создании задания" },
      { status: 500 }
    )
  }
}
