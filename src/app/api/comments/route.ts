import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { z } from "zod"
import type { CommentWithUser } from "@/types/comment"
import { canModerateContent } from "@/lib/rbac"
import type { UserRole } from "@/types"

const createCommentSchema = z.object({
  content: z.string().min(1, "Комментарий не может быть пустым").max(2000, "Комментарий слишком длинный"),
  courseUid: z.string().uuid("Неверный ID курса"),
  parentUid: z.string().uuid().optional().nullable(),
})

/**
 * GET /api/comments?courseUid=...
 * Get all comments for a course (with nested replies)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const courseUid = searchParams.get("courseUid")

    if (!courseUid) {
      return NextResponse.json(
        { error: "courseUid обязателен" },
        { status: 400 }
      )
    }

    // Проверяем существование курса
    const course = await db.course.findUnique({
      where: { courseUid },
    })

    if (!course) {
      return NextResponse.json(
        { error: "Курс не найден" },
        { status: 404 }
      )
    }

    // Получаем все комментарии курса (только корневые, без ответов)
    const rootComments = await db.comment.findMany({
      where: {
        courseUid,
        parentUid: null, // Только корневые комментарии
        isApproved: true, // Только одобренные
      },
      include: {
        user: {
          select: {
            userUid: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Для каждого корневого комментария получаем ответы
    const commentsWithReplies: CommentWithUser[] = await Promise.all(
      rootComments.map(async (comment) => {
        const replies = await db.comment.findMany({
          where: {
            parentUid: comment.commentUid,
            isApproved: true,
          },
          include: {
            user: {
              select: {
                userUid: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        })

        return {
          ...comment,
          user: {
            userUid: comment.user.userUid,
            name: comment.user.name,
            email: comment.user.email,
            avatarUrl: comment.user.avatarUrl,
          },
          replies: replies.map((reply) => ({
            ...reply,
            user: {
              userUid: reply.user.userUid,
              name: reply.user.name,
              email: reply.user.email,
              avatarUrl: reply.user.avatarUrl,
            },
          })),
        }
      })
    )

    return NextResponse.json({
      comments: commentsWithReplies,
      total: commentsWithReplies.length,
    })
  } catch (error) {
    console.error("Error fetching comments:", error)
    return NextResponse.json(
      { error: "Ошибка при получении комментариев" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/comments
 * Create a new comment
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const role = session.user.role as UserRole
    const body = await request.json()
    const data = createCommentSchema.parse(body)

    // Проверяем существование курса
    const course = await db.course.findUnique({
      where: { courseUid: data.courseUid },
    })

    if (!course) {
      return NextResponse.json(
        { error: "Курс не найден" },
        { status: 404 }
      )
    }

    // Если это ответ на комментарий, проверяем существование родительского комментария
    if (data.parentUid) {
      const parentComment = await db.comment.findUnique({
        where: { commentUid: data.parentUid },
      })

      if (!parentComment) {
        return NextResponse.json(
          { error: "Родительский комментарий не найден" },
          { status: 404 }
        )
      }

      // Проверяем, что родительский комментарий принадлежит тому же курсу
      if (parentComment.courseUid !== data.courseUid) {
        return NextResponse.json(
          { error: "Неверный курс для ответа" },
          { status: 400 }
        )
      }
    }

    // Создаем комментарий
    const autoApprove = canModerateContent(role)

    const comment = await db.comment.create({
      data: {
        content: data.content,
        courseUid: data.courseUid,
        userUid: session.user.id,
        parentUid: data.parentUid || null,
        isApproved: autoApprove,
      },
      include: {
        user: {
          select: {
            userUid: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        course: {
          select: {
            title: true,
          },
        },
      },
    })

    // Если это ответ на комментарий, отправляем уведомление
    if (data.parentUid) {
      const { notifyCommentReply } = await import("@/lib/notifications")
      await notifyCommentReply(
        data.parentUid,
        data.content,
        data.courseUid,
        comment.course.title
      )
    }

    return NextResponse.json(
      {
        comment: {
          ...comment,
          user: {
            userUid: comment.user.userUid,
            name: comment.user.name,
            email: comment.user.email,
            avatarUrl: comment.user.avatarUrl,
          },
          replies: [],
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверные данные", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating comment:", error)
    return NextResponse.json(
      { error: "Ошибка при создании комментария" },
      { status: 500 }
    )
  }
}
