"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToastContext } from "@/components/ToastProvider"
import { Star } from "lucide-react"

type RatingSummary = { average: number; count: number }
type MyRating = { rating: number; review: string | null; updatedAt: string }

export function CourseRatingWidget({ courseUid }: { courseUid: string }) {
  const { showToast } = useToastContext()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState<RatingSummary>({ average: 0, count: 0 })
  const [my, setMy] = useState<MyRating | null>(null)
  const [draftRating, setDraftRating] = useState<number>(0)
  const [draftReview, setDraftReview] = useState<string>("")

  const avgText = useMemo(() => summary.average.toFixed(1), [summary.average])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/courses/${courseUid}/rating`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || "Ошибка")
        setSummary(data.summary || { average: 0, count: 0 })
        setMy(data.myRating || null)
        setDraftRating(data.myRating?.rating ?? 0)
        setDraftReview(data.myRating?.review ?? "")
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Ошибка", "error")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [courseUid, showToast])

  const save = async () => {
    if (draftRating < 1 || draftRating > 5) {
      showToast("Выберите оценку от 1 до 5", "error")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/courses/${courseUid}/rating`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: draftRating, review: draftReview.trim() || null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Ошибка")
      setMy(data.myRating)
      showToast("Оценка сохранена", "success")

      // refresh summary
      const res2 = await fetch(`/api/courses/${courseUid}/rating`)
      const data2 = await res2.json().catch(() => ({}))
      if (res2.ok && data2.summary) setSummary(data2.summary)
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Рейтинг</div>
          <div className="flex items-center gap-2 mt-1">
            <div className="text-2xl font-bold">{avgText}</div>
            <div className="text-sm text-muted-foreground">({summary.count})</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, idx) => {
            const v = idx + 1
            const active = draftRating >= v
            return (
              <button
                key={v}
                type="button"
                onClick={() => setDraftRating(v)}
                className="p-1"
                title={`${v}/5`}
                disabled={loading || saving}
              >
                <Star className={`h-5 w-5 ${active ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-sm text-muted-foreground mb-1">Отзыв (опционально)</div>
        <Textarea
          value={draftReview}
          onChange={(e) => setDraftReview(e.target.value)}
          placeholder="Напишите пару слов о курсе..."
          className="min-h-[90px]"
          disabled={loading || saving}
        />
        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-muted-foreground">
            {my ? `Последнее обновление: ${new Date(my.updatedAt).toLocaleString()}` : "Ещё нет вашей оценки"}
          </div>
          <Button onClick={save} disabled={loading || saving}>
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </div>
    </div>
  )
}

