"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Bell, Check, CheckCheck, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale/ru"
import Link from "next/link"
import type { Notification } from "@/types/notification"

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Загрузка уведомлений
  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/notifications?limit=10")
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Загрузка количества непрочитанных
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch("/api/notifications/count")
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.count || 0)
      }
    } catch (error) {
      console.error("Error fetching unread count:", error)
    }
  }

  // Загрузка при монтировании и периодическое обновление
  useEffect(() => {
    fetchNotifications()
    fetchUnreadCount()

    // Обновляем каждые 30 секунд
    const interval = setInterval(() => {
      fetchUnreadCount()
      if (isOpen) {
        fetchNotifications()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [isOpen])

  // Открытие/закрытие dropdown
  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Отметить как прочитанное
  const markAsRead = async (notificationUid: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationUid}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isRead: true }),
      })

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.notificationUid === notificationUid ? { ...n, isRead: true } : n
          )
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  // Отметить все как прочитанные
  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "PATCH",
      })

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error("Error marking all as read:", error)
    }
  }

  // Обработка клика по уведомлению
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.notificationUid)
    }
    setIsOpen(false)
    if (notification.link) {
      router.push(notification.link)
    }
  }

  // Иконка для типа уведомления
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "COURSE_PUBLISHED":
        return "📚"
      case "QUIZ_GRADED":
        return "✅"
      case "COMMENT_REPLY":
        return "💬"
      case "ASSIGNMENT_GRADED":
        return "📝"
      case "CERTIFICATE_ISSUED":
        return "🎓"
      case "COURSE_ENROLLED":
        return "📖"
      default:
        return "🔔"
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 mt-2 w-80 max-h-[500px] overflow-hidden z-50 shadow-lg border-2">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Уведомления</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-8 text-xs"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Прочитать все
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Нет уведомлений</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.notificationUid}
                    className={`p-4 border-b last:border-0 cursor-pointer hover:bg-accent transition-colors ${
                      !notification.isRead ? "bg-blue-50/50" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={`text-sm font-medium ${
                              !notification.isRead ? "font-semibold" : ""
                            }`}
                          >
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: ru,
                          })}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(notification.notificationUid)
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {notifications.length > 0 && (
              <div className="p-3 border-t text-center">
                <Link href="/notifications">
                  <Button variant="outline" size="sm" className="w-full">
                    Показать все уведомления
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
