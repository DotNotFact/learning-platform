"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useToastContext } from "@/components/ToastProvider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

export function EnrollCourseButton({
  courseUid,
  price,
  courseTitle,
}: {
  courseUid: string
  price?: number | null
  courseTitle?: string | null
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const router = useRouter()
  const { showToast } = useToastContext()
  const isPaidCourse = typeof price === "number" && price > 0

  const enroll = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseUid }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Ошибка при записи на курс")

      showToast("Вы записались на курс", "success")
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const purchase = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "COURSE_PURCHASE",
          courseUid,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Ошибка при покупке доступа")

      showToast("Покупка выполнена (тестовая). Доступ открыт.", "success")
      setIsDialogOpen(false)
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isPaidCourse) {
    return (
      <form
        action="/api/enrollments"
        method="post"
        onSubmit={(event) => {
          event.preventDefault()
          void enroll()
        }}
      >
        <input type="hidden" name="courseUid" value={courseUid} />
        <Button
          disabled={isLoading}
          size="lg"
          type="submit"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Запись...
            </>
          ) : (
            "Записаться на курс"
          )}
        </Button>
      </form>
    )
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => !isLoading && setIsDialogOpen(open)}>
      <DialogTrigger asChild>
        <Button size="lg">Купить доступ</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Тестовая покупка</DialogTitle>
          <DialogDescription>
            Платежи отключены - это бесплатная заглушка для проверки сценария покупки.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Курс</span>
            <span className="font-medium">{courseTitle ?? "Доступ к курсу"}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Стоимость</span>
            <Badge>{price} ₽</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            После подтверждения вы сразу получите доступ к материалам.
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={(event) => {
              event.preventDefault()
              setIsDialogOpen(false)
            }}
            disabled={isLoading}
            type="button"
          >
            Отмена
          </Button>
          <Button
            onClick={(event) => {
              event.preventDefault()
              void purchase()
            }}
            disabled={isLoading}
            type="button"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Покупка...
              </>
            ) : (
              "Подтвердить"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
