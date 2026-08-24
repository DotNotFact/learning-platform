import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { z } from "zod"
import { canModerateContent } from "@/lib/rbac"
import type { UserRole } from "@/types"

const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  isApproved: z.boolean().optional(),
})

/**
 * PATCH /api/comments/[commentUid]
 * Update a comment (content or moderation status)
 * Users can edit their own comments, Moderators+ can edit any and moderate
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ commentUid: string }> | { commentUid: string } }
) {
  try {
    const session = await requireAuth()
    const resolvedParams = await Promise.resolve(params)
    const body = await request.json()
    const data = updateCommentSchema.parse(body)

    const comment = await db.comment.findUnique({
      where: { commentUid: resolvedParams.commentUid },
      include: {
        user: {
          select: {
            userUid: true,
          },
        },
      },
    })

    if (!comment) {
      return NextResponse.json(
        { error: "Комментарий не найден" },
        { status: 404 }
      )
    }

    const userRole = session.user.role as UserRole
    const isOwner = comment.userUid === session.user.id
    const canModerate = canModerateContent(userRole)

    // Проверка прав: пользователь может редактировать только свой комментарий
    // Модераторы могут редактировать любые комментарии и менять статус модерации
    if (!isOwner && !canModerate) {
      return NextResponse.json(
        { error: "Недостаточно прав для редактирования комментария" },
        { status: 403 }
      )
    }

    // Если меняется статус модерации, нужны права модератора
    if (data.isApproved !== undefined && !canModerate) {
      return NextResponse.json(
        { error: "Только модераторы могут изменять статус модерации" },
        { status: 403 }
      )
    }

    // Если пользователь редактирует свой комментарий, он не может менять статус модерации
    const updateData: {
      content?: string
      isApproved?: boolean
    } = {}

    if (data.content !== undefined) {
      updateData.content = data.content
    }

    if (data.isApproved !== undefined && canModerate) {
      updateData.isApproved = data.isApproved
    }

    const updatedComment = await db.comment.update({
      where: { commentUid: resolvedParams.commentUid },
      data: updateData,
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
    })

    return NextResponse.json({
      comment: {
        ...updatedComment,
        user: {
          userUid: updatedComment.user.userUid,
          name: updatedComment.user.name,
          email: updatedComment.user.email,
          avatarUrl: updatedComment.user.avatarUrl,
        },
      },
    })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверные данные", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating comment:", error)
    return NextResponse.json(
      { error: "Ошибка при обновлении комментария" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/comments/[commentUid]
 * Delete a comment
 * Users can delete their own comments, Moderators+ can delete any
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentUid: string }> | { commentUid: string } }
) {
  try {
    const session = await requireAuth()
    const resolvedParams = await Promise.resolve(params)

    const comment = await db.comment.findUnique({
      where: { commentUid: resolvedParams.commentUid },
    })

    if (!comment) {
      return NextResponse.json(
        { error: "Комментарий не найден" },
        { status: 404 }
      )
    }

    const userRole = session.user.role as UserRole
    const isOwner = comment.userUid === session.user.id
    const canModerate = canModerateContent(userRole)

    // Проверка прав
    if (!isOwner && !canModerate) {
      return NextResponse.json(
        { error: "Недостаточно прав для удаления комментария" },
        { status: 403 }
      )
    }

    // Удаляем комментарий (каскадное удаление ответов настроено в Prisma)
    await db.comment.delete({
      where: { commentUid: resolvedParams.commentUid },
    })

    return NextResponse.json({ message: "Комментарий удален" })
  } catch (error) {
    console.error("Error deleting comment:", error)
    return NextResponse.json(
      { error: "Ошибка при удалении комментария" },
      { status: 500 }
    )
  }
}
