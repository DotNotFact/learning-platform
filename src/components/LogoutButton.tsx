"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function LogoutButton() {
  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/login", redirect: true })
    } finally {
      if (typeof window !== "undefined") {
        window.location.href = "/api/auth/signout?callbackUrl=/login"
      }
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={() => void handleLogout()} type="button">
      <LogOut className="h-4 w-4 mr-2" />
      Выйти
    </Button>
  )
}
