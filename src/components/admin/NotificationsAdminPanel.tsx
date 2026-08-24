"use client"

import { useMemo, useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToastContext } from "@/components/ToastProvider"
import { CheckCircle2, RefreshCw, Send, Trash2 } from "lucide-react"

export type AdminNotification = {
  notificationUid: string
  userUid: string
  type: string
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: string | Date
  user: { userUid: string; name: string | null; email: string }
}

export function NotificationsAdminPanel({
  initialNotifications,
  users,
}: {
  initialNotifications: AdminNotification[]
  users: Array<{ userUid: string; name: string | null; email: string }>
}) {
  const { showToast } = useToastContext()
  const [notifications, setNotifications] = useState<AdminNotification[]>(initialNotifications)
  const [filterIsRead, setFilterIsRead] = useState<"all" | "true" | "false">("all")
  const [filterUserUid, setFilterUserUid] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(false)

  // send form
  const [broadcast, setBroadcast] = useState(false)
  const [sendUserUid, setSendUserUid] = useState<string>("")
  const [sendType, setSendType] = useState<string>("SYSTEM")
  const [sendTitle, setSendTitle] = useState("")
  const [sendMessage, setSendMessage] = useState("")
  const [sendLink, setSendLink] = useState("")
  const [isSending, setIsSending] = useState(false)

  const types = useMemo(() => {
    const set = new Set<string>(notifications.map((n) => n.type))
    return Array.from(set).sort()
  }, [notifications])

  const load = async () => {
    setIsLoading(true)
    try {
      const qs = new URLSearchParams()
      qs.set("limit", "200")
      qs.set("isRead", filterIsRead)
      if (filterUserUid !== "all") qs.set("userUid", filterUserUid)
      if (filterType !== "all") qs.set("type", filterType)

      const res = await fetch(`/api/admin/notifications?${qs.toString()}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Ошибка при загрузке уведомлений")
      setNotifications(data.notifications || [])
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const mark = async (notificationUid: string, isRead: boolean) => {
    try {
      const res = await fetch(`/api/admin/notifications/${notificationUid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Ошибка при обновлении")
      setNotifications((prev) =>
        prev.map((n) => (n.notificationUid === notificationUid ? data.notification : n))
      )
      showToast("Обновлено", "success")
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error")
    }
  }

  const remove = async (notificationUid: string) => {
    if (!confirm("Удалить уведомление?")) return
    try {
      const res = await fetch(`/api/admin/notifications/${notificationUid}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Ошибка при удалении")
      setNotifications((prev) => prev.filter((n) => n.notificationUid !== notificationUid))
      showToast("Удалено", "success")
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error")
    }
  }

  const send = async () => {
    if (!sendTitle.trim() || !sendMessage.trim()) {
      showToast("Заполните title и message", "error")
      return
    }
    if (!broadcast && !sendUserUid) {
      showToast("Выберите получателя или включите рассылку всем", "error")
      return
    }
    setIsSending(true)
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broadcast,
          userUid: broadcast ? null : sendUserUid,
          type: sendType,
          title: sendTitle.trim(),
          message: sendMessage.trim(),
          link: sendLink.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Ошибка при отправке")
      showToast(broadcast ? `Разослано: ${data.created}` : "Отправлено", "success")
      setSendTitle("")
      setSendMessage("")
      setSendLink("")
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-4">
        <div className="font-semibold mb-3 flex items-center gap-2">
          <Send className="h-4 w-4" />
          Отправить уведомление
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Тип</div>
            <Select value={sendType} onValueChange={setSendType}>
              <SelectTrigger>
                <SelectValue placeholder="Тип" />
              </SelectTrigger>
              <SelectContent>
                {[
                  "SYSTEM",
                  "COURSE_PUBLISHED",
                  "QUIZ_GRADED",
                  "COMMENT_REPLY",
                  "ASSIGNMENT_GRADED",
                  "CERTIFICATE_ISSUED",
                  "COURSE_ENROLLED",
                ].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Получатель</div>
            <Select
              value={broadcast ? "broadcast" : sendUserUid || "select"}
              onValueChange={(v) => {
                if (v === "broadcast") {
                  setBroadcast(true)
                  setSendUserUid("")
                } else if (v === "select") {
                  setBroadcast(false)
                  setSendUserUid("")
                } else {
                  setBroadcast(false)
                  setSendUserUid(v)
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите получателя" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="broadcast">Всем пользователям (broadcast)</SelectItem>
                <SelectItem value="select">— выбрать пользователя —</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.userUid} value={u.userUid}>
                    {u.name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 md:col-span-2">
            <div className="text-sm text-muted-foreground">Заголовок</div>
            <Input value={sendTitle} onChange={(e) => setSendTitle(e.target.value)} />
          </div>

          <div className="space-y-1 md:col-span-2">
            <div className="text-sm text-muted-foreground">Текст</div>
            <Textarea value={sendMessage} onChange={(e) => setSendMessage(e.target.value)} className="min-h-[110px]" />
          </div>

          <div className="space-y-1 md:col-span-2">
            <div className="text-sm text-muted-foreground">Ссылка (опционально)</div>
            <Input value={sendLink} onChange={(e) => setSendLink(e.target.value)} placeholder="/courses/..." />
          </div>
        </div>

        <div className="flex justify-end mt-3">
          <Button onClick={send} disabled={isSending} className="gap-2">
            <Send className="h-4 w-4" />
            {isSending ? "Отправка..." : "Отправить"}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterIsRead} onValueChange={(value) => setFilterIsRead(value as "all" | "true" | "false")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="false">Непрочитанные</SelectItem>
                <SelectItem value="true">Прочитанные</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterUserUid} onValueChange={setFilterUserUid}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Пользователь" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все пользователи</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.userUid} value={u.userUid}>
                    {u.name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                {types.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={load} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Обновить
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пользователь</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Заголовок</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    Нет уведомлений
                  </TableCell>
                </TableRow>
              ) : (
                notifications.map((n) => (
                  <TableRow key={n.notificationUid} className="hover:bg-accent/50 transition-colors">
                    <TableCell className="max-w-[240px] truncate">{n.user?.name || n.user?.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{n.type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[420px] truncate">{n.title}</TableCell>
                    <TableCell>
                      {n.isRead ? (
                        <Badge variant="secondary">Прочитано</Badge>
                      ) : (
                        <Badge className="bg-blue-500 hover:bg-blue-600">Непрочитано</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!n.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Отметить прочитанным"
                            onClick={() => mark(n.notificationUid, true)}
                            className="hover:text-green-600"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Удалить"
                          onClick={() => remove(n.notificationUid)}
                          className="hover:text-destructive"
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
    </div>
  )
}
