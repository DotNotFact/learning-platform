"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"
import { useToastContext } from "@/components/ToastProvider"

export function FavoriteButton({
  courseUid,
  initialIsFavorited,
  size = "default",
  variant = "outline",
}: {
  courseUid: string
  initialIsFavorited: boolean
  size?: "default" | "sm" | "lg" | "icon"
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "link"
}) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited)
  const [isSaving, setIsSaving] = useState(false)
  const { showToast } = useToastContext()

  const toggle = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/favorites/${courseUid}`, {
        method: isFavorited ? "DELETE" : "POST",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Ошибка")
      setIsFavorited(Boolean(data?.isFavorited))
      showToast(isFavorited ? "Удалено из избранного" : "Добавлено в избранное", "success")
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={toggle}
      disabled={isSaving}
      className={isFavorited ? "text-red-600 hover:text-red-700" : undefined}
      title={isFavorited ? "Убрать из избранного" : "Добавить в избранное"}
    >
      <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
      {size !== "icon" && <span className="ml-2">{isFavorited ? "В избранном" : "В избранное"}</span>}
    </Button>
  )
}

