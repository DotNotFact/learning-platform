"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, Copy } from "lucide-react"

interface CopyLinkButtonProps {
  value: string
  label?: string
}

export function CopyLinkButton({ value, label = "Скопировать ссылку" }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy link:", error)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          Скопировано
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 mr-2" />
          {label}
        </>
      )}
    </Button>
  )
}
