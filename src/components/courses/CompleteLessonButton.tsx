"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2 } from "lucide-react"
import { useToastContext } from "@/components/ToastProvider"

export function CompleteLessonButton({
  lessonUid,
}: {
  lessonUid: string
}) {
  const [isLoading, setIsLoading] = useState(false)
  const { showToast } = useToastContext()
  const router = useRouter()

  const complete = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonUid, completed: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Ошибка при обновлении прогресса")

      showToast("Урок отмечен как завершенный", "success")
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={complete} disabled={isLoading} className="w-full" size="lg">
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Сохранение...
        </>
      ) : (
        <>
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Завершить урок
        </>
      )}
    </Button>
  )
}

