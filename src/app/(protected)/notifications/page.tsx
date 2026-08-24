import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale/ru"
import Link from "next/link"
import { Bell, ArrowLeft } from "lucide-react"
import { NotificationsActions } from "@/components/NotificationsActions"

export default async function NotificationsPage() {
  const session = await requireAuth()
  const userUid = session.user.id

  const notifications = await db.notification.findMany({
    where: {
      userUid,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  const unreadCount = notifications.filter((n) => !n.isRead).length

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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
              <Bell className="h-8 w-8 text-primary" />
              Уведомления
            </h1>
            <p className="text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} непрочитанных уведомлений`
                : "Все уведомления прочитаны"}
            </p>
          </div>
          {unreadCount > 0 && (
            <NotificationsActions unreadCount={unreadCount} />
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card className="border-2">
          <CardContent className="py-16 text-center">
            <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Нет уведомлений</h3>
            <p className="text-muted-foreground">
              Когда появятся новые уведомления, они отобразятся здесь
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card
              key={notification.notificationUid}
              className={`border-2 transition-all hover:shadow-md ${
                !notification.isRead ? "bg-blue-50/50 border-blue-200" : ""
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="text-3xl shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3
                            className={`text-lg font-semibold ${
                              !notification.isRead ? "text-primary" : ""
                            }`}
                          >
                            {notification.title}
                          </h3>
                          {!notification.isRead && (
                            <Badge variant="default" className="text-xs">
                              Новое
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: ru,
                        })}
                      </p>
                      <div className="flex items-center gap-2">
                        {notification.link && (
                          <Link href={notification.link}>
                            <Button variant="outline" size="sm">
                              Перейти
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
