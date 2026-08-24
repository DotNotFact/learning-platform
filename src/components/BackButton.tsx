"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { getReturnToPath } from "@/lib/navigation"
import { useEffect, useState } from "react"

interface BackButtonProps {
  defaultPath?: string
  label?: string
}

export function BackButton({ defaultPath, label }: BackButtonProps) {
  const router = useRouter()
  const [returnPath, setReturnPath] = useState(defaultPath || "/dashboard")
  const [buttonLabel, setButtonLabel] = useState(label || "Назад")

  useEffect(() => {
    // Определяем путь возврата на клиенте
    const path = defaultPath || getReturnToPath()
    setReturnPath(path)

    // Определяем текст кнопки
    if (!label) {
      if (path.includes("/admin")) {
        setButtonLabel("Назад в админ-панель")
      } else if (path.includes("/courses")) {
        setButtonLabel("Назад к курсам")
      } else {
        setButtonLabel("Назад")
      }
    }
  }, [defaultPath, label])

  const handleBack = () => {
    router.push(returnPath)
  }

  return (
    <Button variant="ghost" className="gap-2 hover:bg-accent" onClick={handleBack}>
      <ArrowLeft className="h-4 w-4" />
      {buttonLabel}
    </Button>
  )
}
