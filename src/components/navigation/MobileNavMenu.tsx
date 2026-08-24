"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type MobileNavItem = {
  href: string
  label: string
  description?: string
}

interface MobileNavMenuProps {
  items: MobileNavItem[]
  children?: React.ReactNode
}

export function MobileNavMenu({ items, children }: MobileNavMenuProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="relative md:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-expanded={open}
        aria-label="Открыть меню"
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {open && (
        <div
          className={cn(
            "fixed right-3 top-16 z-50 w-72 max-w-[85vw] rounded-2xl border bg-white/95 shadow-2xl",
            "backdrop-blur-sm"
          )}
        >
          <div className="flex items-center justify-between border-b bg-linear-to-r from-primary/10 via-white to-white px-4 py-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Навигация</div>
              <div className="text-sm font-semibold text-gray-900">Платформа обучения</div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Закрыть меню"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            <div className="flex flex-col gap-1 p-3">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-gray-700 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span>{item.label}</span>
                  </div>
                  {item.description && (
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  )}
                </Link>
              ))}
              {children && <div className="border-t px-3 py-3">{children}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
