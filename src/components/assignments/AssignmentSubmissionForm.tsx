"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useToastContext } from "@/components/ToastProvider"

export function AssignmentSubmissionForm({
  assignmentUid,
}: {
  assignmentUid: string
}) {
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showToast } = useToastContext()
  const router = useRouter()

  const submit = async () => {
    if (!content.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/assignments/${assignmentUid}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || "Ошибка при отправке задания")
      }

      showToast("Задание отправлено", "success")
      setContent("")
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка при отправке", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Введите ваш ответ..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[140px]"
      />
      <div className="flex justify-end">
        <Button onClick={submit} disabled={isSubmitting || !content.trim()}>
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
  )
}

