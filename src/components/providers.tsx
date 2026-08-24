"use client"

import { SessionProvider } from "next-auth/react"
import { SessionGuard } from "./SessionGuard"
import { ToastProvider } from "./ToastProvider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionGuard>
        <ToastProvider>{children}</ToastProvider>
      </SessionGuard>
    </SessionProvider>
  )
}
