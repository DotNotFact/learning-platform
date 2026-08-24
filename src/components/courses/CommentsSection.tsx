"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CommentItem } from "./CommentItem"
import { MessageSquare, Loader2 } from "lucide-react"
import type { CommentWithUser } from "@/types/comment"

interface CommentsSectionProps {
  courseUid: string
}

export function CommentsSection({ courseUid }: CommentsSectionProps) {
  const { data: session } = useSession()
  const [comments, setComments] = useState<CommentWithUser[]>([])
  const [newComment, setNewComment] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingNotice, setPendingNotice] = useState<string | null>(null)

  // Загрузка комментариев
  const fetchComments = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`/api/comments?courseUid=${courseUid}`)
      
      if (!response.ok) {
        throw new Error("Ошибка при загрузке комментариев")
      }

      const data = await response.json()
      setComments(data.comments || [])
    } catch (err) {
      console.error("Error fetching comments:", err)
      setError("Не удалось загрузить комментарии")
    } finally {
      setIsLoading(false)
    }
  }, [courseUid])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // Создание нового комментария
  const handleAddComment = async () => {
    if (!newComment.trim() || !session) return

    setIsSubmitting(true)
    setPendingNotice(null)
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newComment,
          courseUid,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Ошибка при создании комментария")
      }

      const data = await response.json()
      if (data.comment?.isApproved) {
        setComments([data.comment, ...comments])
      } else {
        setPendingNotice("Комментарий отправлен на модерацию и будет показан после одобрения.")
      }
      setNewComment("")
    } catch (err) {
      console.error("Error creating comment:", err)
      alert(err instanceof Error ? err.message : "Не удалось создать комментарий")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ответ на комментарий
  const handleReply = async (parentUid: string, content: string) => {
    if (!session) return

    try {
      setPendingNotice(null)
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          courseUid,
          parentUid,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Ошибка при создании ответа")
      }

      const data = await response.json()
      if (data.comment?.isApproved) {
        // Обновляем комментарии, добавляя ответ к родительскому комментарию
        setComments((prev) =>
          prev.map((comment) => {
            if (comment.commentUid === parentUid) {
              return {
                ...comment,
                replies: [...(comment.replies || []), data.comment],
              }
            }
            return comment
          })
        )
      } else {
        setPendingNotice("Ответ отправлен на модерацию и появится после одобрения.")
      }
    } catch (err) {
      console.error("Error replying to comment:", err)
      throw err
    }
  }

  // Редактирование комментария
  const handleEdit = async (commentUid: string, content: string) => {
    try {
      const response = await fetch(`/api/comments/${commentUid}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Ошибка при обновлении комментария")
      }

      const data = await response.json()
      // Обновляем комментарий в списке
      const updateCommentInTree = (comments: CommentWithUser[]): CommentWithUser[] => {
        return comments.map((comment) => {
          if (comment.commentUid === commentUid) {
            return data.comment
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: updateCommentInTree(comment.replies),
            }
          }
          return comment
        })
      }

      setComments(updateCommentInTree(comments))
    } catch (err) {
      console.error("Error editing comment:", err)
      throw err
    }
  }

  // Удаление комментария
  const handleDelete = async (commentUid: string) => {
    try {
      const response = await fetch(`/api/comments/${commentUid}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Ошибка при удалении комментария")
      }

      // Удаляем комментарий из дерева
      const removeCommentFromTree = (comments: CommentWithUser[]): CommentWithUser[] => {
        return comments
          .filter((comment) => comment.commentUid !== commentUid)
          .map((comment) => {
            if (comment.replies) {
              return {
                ...comment,
                replies: removeCommentFromTree(comment.replies),
              }
            }
            return comment
          })
      }

      setComments(removeCommentFromTree(comments))
    } catch (err) {
      console.error("Error deleting comment:", err)
      throw err
    }
  }

  return (
    <section className="mt-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-3xl font-bold">Комментарии</h2>
        {comments.length > 0 && (
          <span className="text-muted-foreground">({comments.length})</span>
        )}
      </div>

      {/* Форма добавления комментария */}
      {session && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="space-y-3">
              <Textarea
                placeholder="Напишите комментарий..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={4}
                className="min-h-[100px]"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleAddComment}
                  disabled={isSubmitting || !newComment.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    "Отправить"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Сообщение для неавторизованных пользователей */}
      {!session && (
        <Card className="mb-6">
          <CardContent className="p-4 text-center text-muted-foreground">
            <p>Войдите, чтобы оставить комментарий</p>
          </CardContent>
        </Card>
      )}

      {pendingNotice && (
        <Card className="mb-6 border-dashed">
          <CardContent className="p-4 text-sm text-muted-foreground">
            {pendingNotice}
          </CardContent>
        </Card>
      )}

      {/* Список комментариев */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Загрузка комментариев...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-destructive">{error}</p>
            <Button
              variant="outline"
              onClick={fetchComments}
              className="mt-4"
            >
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      ) : comments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground text-lg">
              Пока нет комментариев. Будьте первым!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.commentUid}
              comment={comment}
              courseUid={courseUid}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </section>
  )
}
