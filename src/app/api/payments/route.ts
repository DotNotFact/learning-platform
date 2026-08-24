import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

const paymentSchema = z.object({
  type: z.enum(["DONATION", "COURSE_PURCHASE"]),
  amount: z.coerce.number().min(0).optional(),
  title: z.string().min(1).max(120).optional(),
  courseUid: z.string().uuid().optional(),
})

/**
 * POST /api/payments
 * Create a stub payment for donation or course purchase
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    let body: Record<string, unknown>
    const contentType = request.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) {
      body = await request.json()
    } else {
      const formData = await request.formData()
      body = Object.fromEntries(formData.entries())
    }
    const data = paymentSchema.parse(body)

    if (data.type === "COURSE_PURCHASE") {
      if (!session) {
        return NextResponse.json({ error: "Требуется авторизация для покупки курса" }, { status: 401 })
      }

      if (!data.courseUid) {
        return NextResponse.json({ error: "Не указан курс" }, { status: 400 })
      }

      const course = await db.course.findUnique({
        where: { courseUid: data.courseUid },
      })

      if (!course) {
        return NextResponse.json({ error: "Курс не найден" }, { status: 404 })
      }

      if (!course.isPublished) {
        return NextResponse.json({ error: "Курс не опубликован" }, { status: 403 })
      }

      const existing = await db.enrollment.findUnique({
        where: { userUid_courseUid: { userUid: session.user.id, courseUid: data.courseUid } },
      })

      if (existing) {
        return NextResponse.json({ error: "Вы уже записаны на этот курс" }, { status: 400 })
      }

      const amount = course.price ?? 0

      if (amount <= 0) {
        const enrollment = await db.enrollment.create({
          data: {
            userUid: session.user.id,
            courseUid: data.courseUid,
          },
          include: {
            course: {
              select: {
                courseUid: true,
                title: true,
                thumbnailUrl: true,
              },
            },
          },
        })

        return NextResponse.json({ enrollment }, { status: 201 })
      }

      const [payment, enrollment] = await db.$transaction([
        db.payment.create({
          data: {
            userUid: session.user.id,
            courseUid: data.courseUid,
            type: "COURSE_PURCHASE",
            amount,
            currency: "RUB",
            status: "SUCCEEDED",
            provider: "STUB",
            title: course.title,
          },
        }),
        db.enrollment.create({
          data: {
            userUid: session.user.id,
            courseUid: data.courseUid,
          },
          include: {
            course: {
              select: {
                courseUid: true,
                title: true,
                thumbnailUrl: true,
              },
            },
          },
        }),
      ])

      return NextResponse.json({ payment, enrollment }, { status: 201 })
    }

    const amount = data.amount ?? 0

    if (amount <= 0) {
      return NextResponse.json({ error: "Сумма доната должна быть больше нуля" }, { status: 400 })
    }

    const payment = await db.payment.create({
      data: {
        ...(session ? { userUid: session.user.id } : {}),
        type: "DONATION",
        amount,
        currency: "RUB",
        status: "SUCCEEDED",
        provider: "STUB",
        title: data.title ?? "Донат",
      },
    })

    return NextResponse.json({ payment }, { status: 201 })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверные данные", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating payment:", error)
    return NextResponse.json({ error: "Ошибка при создании платежа" }, { status: 500 })
  }
}
