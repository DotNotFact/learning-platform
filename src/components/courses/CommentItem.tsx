"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale/ru"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Reply, Trash2, Edit2, Check, X } from "lucide-react"
import type { CommentWithUser } from "@/types/comment"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"

interface CommentItemProps {
  comment: CommentWithUser
  courseUid: string
  onReply?: (parentUid: string, content: string) => Promise<void>
  onEdit?: (commentUid: string, content: string) => Promise<void>
  onDelete?: (commentUid: string) => Promise<void>
  level?: number
}

export function CommentItem({
  comment,
  courseUid,
  onReply,
  onEdit,
  onDelete,
  level = 0,
}: CommentItemProps) {
  const { data: session } = useSession()
  const [isReplying, setIsReplying] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [editContent, setEditContent] = useState(comment.content)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isOwner = session?.user?.id === comment.userUid
  const maxLevel = 2 // Максимальная глубина вложенности

  const handleReply = async () => {
    if (!replyContent.trim() || !onReply) return

    setIsSubmitting(true)
    try {
      await onReply(comment.commentUid, replyContent)
      setReplyContent("")
      setIsReplying(false)
    } catch (error) {
      console.error("Error replying to comment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editContent.trim() || !onEdit) return

    setIsSubmitting(true)
    try {
      await onEdit(comment.commentUid, editContent)
      setIsEditing(false)
    } catch (error) {
      console.error("Error editing comment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete || !confirm("Вы уверены, что хотите удалить этот комментарий?")) return

    try {
      await onDelete(comment.commentUid)
    } catch (error) {
      console.error("Error deleting comment:", error)
    }
  }

  return (
    <div className={level > 0 ? "ml-6 mt-4 border-l-2 border-muted pl-4" : ""}>
      <Card className={level > 0 ? "bg-muted/30" : ""}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Аватар */}
            <Link href={`/users/${comment.user.userUid}`} className="shrink-0">
              {comment.user.avatarUrl ? (
                <Image
                  src={comment.user.avatarUrl}
                  alt={comment.user.name || "User"}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold text-sm">
                    {(comment.user.name || comment.user.email)[0].toUpperCase()}
                  </span>
                </div>
              )}
            </Link>

            {/* Контент */}
            <div className="flex-1 min-w-0">
              {/* Заголовок */}
              <div className="flex items-center gap-2 mb-2">
                <Link
                  href={`/users/${comment.user.userUid}`}
                  className="font-semibold text-sm hover:text-primary transition-colors"
                >
                  {comment.user.name || comment.user.email}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.createdAt), {
                    addSuffix: true,
                    locale: ru,
                  })}
                </span>
              </div>

              {/* Текст комментария */}
              {isEditing ? (
                <div className="space-y-2 mb-3">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleEdit}
                      disabled={isSubmitting || !editContent.trim()}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Сохранить
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false)
                        setEditContent(comment.content)
                      }}
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground whitespace-pre-wrap wrap-break-word mb-3">
                  {comment.content}
                </p>
              )}

              {/* Действия */}
              {!isEditing && (
                <div className="flex items-center gap-2">
                  {level < maxLevel && session && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsReplying(!isReplying)}
                      className="h-8"
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      Ответить
                    </Button>
                  )}
                  {isOwner && onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="h-8"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Редактировать
                    </Button>
                  )}
                  {(isOwner || session?.user?.role === "MODERATOR" || session?.user?.role === "ADMIN") &&
                    onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDelete}
                        className="h-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Удалить
                      </Button>
                    )}
                </div>
              )}

              {/* Форма ответа */}
              {isReplying && session && (
                <div className="mt-4 space-y-2">
                  <Textarea
                    placeholder="Напишите ответ..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={3}
                    className="min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleReply}
                      disabled={isSubmitting || !replyContent.trim()}
                    >
                      Отправить
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsReplying(false)
                        setReplyContent("")
                      }}
                      disabled={isSubmitting}
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Вложенные ответы */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.commentUid}
              comment={reply}
              courseUid={courseUid}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
