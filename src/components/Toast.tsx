"use client"

import { useEffect, useState } from "react"
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastType = "success" | "error" | "info" | "warning"

interface ToastProps {
  id: string
  message: string
  type: ToastType
  duration?: number
  onClose: (id: string) => void
}

const toastIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
}

const toastStyles = {
  success: "bg-green-50 border-green-200 text-green-800",
  error: "bg-red-50 border-red-200 text-red-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
}

export function Toast({ id, message, type, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const Icon = toastIcons[type]

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onClose(id), 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, id, onClose])

  if (!isVisible) return null

  return (
    <div
      className={cn(
        // Full-width on mobile to avoid horizontal overflow; fixed-ish width on larger screens.
        "flex items-center gap-3 p-4 rounded-lg border shadow-lg w-full sm:w-auto sm:min-w-[300px] sm:max-w-md animate-in slide-in-from-top-5",
        toastStyles[type]
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <p className="flex-1 min-w-0 text-sm font-medium wrap-break-word">{message}</p>
      <button
        onClick={() => {
          setIsVisible(false)
          setTimeout(() => onClose(id), 300)
        }}
        className="shrink-0 hover:opacity-70 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

let toastIdCounter = 0

export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([])

  const showToast = (message: string, type: ToastType = "info") => {
    const id = `toast-${++toastIdCounter}`
    setToasts((prev) => [...prev, { id, message, type }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  return { toasts, showToast, removeToast }
}

export function ToastContainer({ toasts, onClose }: { toasts: Array<{ id: string; message: string; type: ToastType }>; onClose: (id: string) => void }) {
  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 z-100 flex flex-col items-end gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  )
}
