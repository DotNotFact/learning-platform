"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  const isPublicRoute =
    pathname === "/" ||
    pathname?.startsWith("/catalog") ||
    pathname?.startsWith("/donate") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/register")

  useEffect(() => {
    // Сохраняем текущий путь в историю навигации
    if (pathname && !isPublicRoute) {
      const history = JSON.parse(sessionStorage.getItem("navHistory") || "[]")
      const lastPath = history[history.length - 1]
      
      // Добавляем только если это новый путь
      if (lastPath !== pathname) {
        history.push(pathname)
        // Храним только последние 5 путей
        if (history.length > 5) {
          history.shift()
        }
        sessionStorage.setItem("navHistory", JSON.stringify(history))
      }
    }
  }, [pathname, isPublicRoute])

  useEffect(() => {
    // Проверяем сессию при загрузке
    if (status === "unauthenticated" && !isPublicRoute) {
      // Проверяем на сервере тоже
      fetch("/api/auth/session")
        .then((res) => res.json())
        .then((data) => {
          if (!data || !data.user) {
            // Сохраняем текущий путь для возврата после логина
            if (pathname && !isPublicRoute) {
              sessionStorage.setItem("returnTo", pathname)
            }
            router.push("/login")
          }
        })
        .catch(() => {
          // При ошибке тоже редиректим на логин
          if (pathname && !isPublicRoute) {
            sessionStorage.setItem("returnTo", pathname)
          }
          router.push("/login")
        })
    }
  }, [status, router, pathname, isPublicRoute])

  // Показываем загрузку пока проверяем сессию
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-gray-50 to-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Проверка авторизации...</p>
        </div>
      </div>
    )
  }

  // Если не авторизован, показываем загрузку (редирект произойдет в useEffect)
  if (status === "unauthenticated" && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-gray-50 to-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Перенаправление...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
