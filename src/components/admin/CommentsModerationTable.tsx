"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToastContext } from "@/components/ToastProvider"
import { CheckCircle2, XCircle, Trash2, RefreshCw, ExternalLink } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale/ru"

export type AdminComment = {
  commentUid: string
  content: string
  isApproved: boolean
  createdAt: string | Date
  parentUid: string | null
  user: { userUid: string; name: string | null; email: string }
  course: { courseUid: string; title: string }
}

export function CommentsModerationTable({ initialComments }: { initialComments: AdminComment[] }) {
  const [comments, setComments] = useState<AdminComment[]>(initialComments)
  const [filter, setFilter] = useState<"all" | "true" | "false">("false")
  const [isLoading, setIsLoading] = useState(false)
  const { showToast } = useToastContext()

  const load = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/comments?approved=${filter}&limit=100`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Ошибка при загрузке")
      setComments(data.comments || [])
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const approve = async (commentUid: string, isApproved: boolean) => {
    try {
      const res = await fetch(`/api/comments/${commentUid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Ошибка при обновлении")
      showToast(isApproved ? "Комментарий одобрен" : "Комментарий отклонён", "success")
      setComments((prev) =>
        prev.map((c) => (c.commentUid === commentUid ? { ...c, isApproved } : c))
      )
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error")
    }
  }

  const remove = async (commentUid: string) => {
    if (!confirm("Удалить комментарий?")) return
    try {
      const res = await fetch(`/api/comments/${commentUid}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Ошибка при удалении")
      showToast("Комментарий удалён", "success")
      setComments((prev) => prev.filter((c) => c.commentUid !== commentUid))
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error")
    }
  }

  const title = useMemo(() => {
    if (filter === "false") return "Ожидают модерации"
    if (filter === "true") return "Одобренные"
    return "Все"
  }, [filter])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="flex items-center gap-2">
          <Button
            variant={filter === "false" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("false")}
          >
            На модерации
          </Button>
          <Button
            variant={filter === "true" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("true")}
          >
            Одобрены
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            Все
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Обновить
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Курс</TableHead>
              <TableHead>Пользователь</TableHead>
              <TableHead>Комментарий</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  Нет комментариев
                </TableCell>
              </TableRow>
            ) : (
              comments.map((c) => (
                <TableRow key={c.commentUid} className="hover:bg-accent/50 transition-colors">
                  <TableCell className="max-w-[220px]">
                    <Link href={`/courses/${c.course.courseUid}?returnTo=/admin`} className="hover:text-primary">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{c.course.title}</span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate">
                    {c.user.name || c.user.email}
                  </TableCell>
                  <TableCell className="max-w-[420px]">
                    <div className="text-sm line-clamp-2">{c.content}</div>
                    {c.parentUid && (
                      <div className="text-xs text-muted-foreground mt-1">Ответ</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.isApproved ? (
                      <Badge className="bg-green-500 hover:bg-green-600">Одобрен</Badge>
                    ) : (
                      <Badge variant="secondary">На модерации</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: ru })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {!c.isApproved && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Одобрить"
                          className="hover:text-green-600"
                          onClick={() => approve(c.commentUid, true)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      {c.isApproved && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Снять одобрение"
                          className="hover:text-yellow-600"
                          onClick={() => approve(c.commentUid, false)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Удалить"
                        className="hover:text-destructive"
                        onClick={() => remove(c.commentUid)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
