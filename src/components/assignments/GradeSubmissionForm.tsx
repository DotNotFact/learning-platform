"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useToastContext } from "@/components/ToastProvider"

export function GradeSubmissionForm({
  submissionUid,
  maxScore,
  defaultScore,
  defaultFeedback,
}: {
  submissionUid: string
  maxScore: number
  defaultScore: number | null
  defaultFeedback: string | null
}) {
  const [score, setScore] = useState<string>(defaultScore === null ? "" : String(defaultScore))
  const [feedback, setFeedback] = useState<string>(defaultFeedback || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showToast } = useToastContext()
  const router = useRouter()

  const submit = async () => {
    const scoreNumber =
      score.trim() === "" ? null : Number.parseInt(score.trim(), 10)
    if (scoreNumber !== null && Number.isNaN(scoreNumber)) {
      showToast("Оценка должна быть числом", "error")
      return
    }
    if (scoreNumber !== null && (scoreNumber < 0 || scoreNumber > maxScore)) {
      showToast(`Оценка должна быть от 0 до ${maxScore}`, "error")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/submissions/${submissionUid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: scoreNumber, feedback }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || "Ошибка при сохранении оценки")
      }
      showToast("Оценка сохранена", "success")
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">Оценка (0–{maxScore})</div>
          <Input value={score} onChange={(e) => setScore(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">Комментарий</div>
        <Textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="min-h-[100px]"
        />
      </div>
      <div className="flex justify-end">
        <Button onClick={submit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Сохранение...
            </>
          ) : (
            "Сохранить"
          )}
        </Button>
      </div>
    </div>
  )
}

