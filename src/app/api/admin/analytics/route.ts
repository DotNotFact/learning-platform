import { NextResponse } from "next/server"
import { requireManager } from "@/lib/auth-helpers"
import { getAdminAnalytics } from "@/lib/admin-analytics"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await requireManager()
    const analytics = await getAdminAnalytics()
    return NextResponse.json({ analytics })
  } catch (error) {
    console.error("Error fetching admin analytics:", error)
    return NextResponse.json({ error: "Ошибка при получении аналитики" }, { status: 500 })
  }
}

