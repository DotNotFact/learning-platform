"use client"

import { useState } from "react"
import { Heart, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToastContext } from "@/components/ToastProvider"

export interface DonateTier {
  title: string
  amount: number
  description: string
}

export function DonateTiers({ tiers }: { tiers: DonateTier[] }) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null)
  const { showToast } = useToastContext()

  const handleDonate = async (tier: DonateTier) => {
    setLoadingTier(tier.title)
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "DONATION",
          amount: tier.amount,
          title: tier.title,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Ошибка при донате")

      showToast("Спасибо за поддержку! (тестовый платеж)", "success")
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error")
    } finally {
      setLoadingTier(null)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {tiers.map((tier) => (
        <Card key={tier.title} className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{tier.title}</span>
              <span className="text-primary">{tier.amount} ₽</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{tier.description}</p>
            <form
              action="/api/payments"
              method="post"
              onSubmit={(event) => {
                event.preventDefault()
                void handleDonate(tier)
              }}
            >
              <input type="hidden" name="type" value="DONATION" />
              <input type="hidden" name="amount" value={tier.amount} />
              <input type="hidden" name="title" value={tier.title} />
              <Button
                className="w-full"
                disabled={loadingTier === tier.title}
                type="submit"
              >
                {loadingTier === tier.title ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Обработка...
                  </>
                ) : (
                  <>
                    <Heart className="h-4 w-4 mr-2" />
                    Поддержать
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
