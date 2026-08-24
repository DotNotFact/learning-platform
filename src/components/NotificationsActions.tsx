"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCheck, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface NotificationsActionsProps {
  unreadCount: number
}

export function NotificationsActions({ unreadCount }: NotificationsActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const markAllAsRead = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "PATCH",
      })

      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error("Error marking all as read:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={markAllAsRead}
      disabled={isLoading || unreadCount === 0}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Обновление...
        </>
      ) : (
        <>
          <CheckCheck className="h-4 w-4 mr-2" />
          Отметить все как прочитанные
        </>
      )}
    </Button>
  )
}
