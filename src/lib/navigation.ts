/**
 * Утилиты для работы с навигацией и историей переходов
 */

export function getNavigationHistory(): string[] {
  if (typeof window === "undefined") return []
  const history = sessionStorage.getItem("navHistory")
  return history ? JSON.parse(history) : []
}

export function getPreviousPath(): string | null {
  const history = getNavigationHistory()
  return history.length >= 2 ? history[history.length - 2] : null
}

export function getLastPath(): string | null {
  const history = getNavigationHistory()
  return history.length > 0 ? history[history.length - 1] : null
}

export function getReturnToPath(): string {
  if (typeof window === "undefined") return "/dashboard"
  
  // Проверяем сохраненный путь для возврата
  const returnTo = sessionStorage.getItem("returnTo")
  if (returnTo) {
    sessionStorage.removeItem("returnTo")
    return returnTo
  }

  // Используем предпоследний путь из истории
  const previousPath = getPreviousPath()
  if (previousPath) {
    // Если предпоследний путь - админка, возвращаемся туда
    if (previousPath.includes("/admin")) {
      return "/admin"
    }
    // Если предпоследний путь - курсы, возвращаемся туда
    if (previousPath.includes("/courses") && !previousPath.match(/\/courses\/[^/]+$/)) {
      return "/courses"
    }
  }

  // По умолчанию возвращаемся на dashboard
  return "/dashboard"
}

export function clearNavigationHistory() {
  if (typeof window === "undefined") return
  sessionStorage.removeItem("navHistory")
}
