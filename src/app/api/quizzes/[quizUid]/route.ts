import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import * as z from "zod"

const updateQuizSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
})

export async function GET(
  req: Request,
  { params }: { params: Promise<{ quizUid: string }> | { quizUid: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)

    const quiz = await db.quiz.findUnique({
      where: {
        quizUid: resolvedParams.quizUid,
      },
      include: {
        questions: {
          orderBy: {
            orderIndex: "asc",
          },
        },
        course: {
          select: {
            courseUid: true,
            title: true,
          },
        },
      },
    })

    if (!quiz) {
      return NextResponse.json({ error: "Тест не найден" }, { status: 404 })
    }

    const quizResponse = {
      ...quiz,
      questions: quiz.questions.map((q: { options: string; correctOptions: string }) => ({
        ...q,
        options: JSON.parse(q.options),
        correctOptions: JSON.parse(q.correctOptions),
      })),
    }

    return NextResponse.json({ quiz: quizResponse })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Произошла ошибка при получении теста" }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ quizUid: string }> | { quizUid: string } }
) {
  try {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })
    }

    const resolvedParams = await Promise.resolve(params)
    const body = await req.json()
    const data = updateQuizSchema.parse(body)

    const quiz = await db.quiz.update({
      where: {
        quizUid: resolvedParams.quizUid,
      },
      data,
      include: {
        questions: true,
      },
    })

    return NextResponse.json({ quiz })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные", details: error.issues }, { status: 400 })
    }

    return NextResponse.json({ error: "Произошла ошибка при обновлении теста" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ quizUid: string }> | { quizUid: string } }
) {
  try {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })
    }

    const resolvedParams = await Promise.resolve(params)
    await db.quiz.delete({
      where: {
        quizUid: resolvedParams.quizUid,
      },
    })

    return NextResponse.json({ message: "Тест удален" })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Произошла ошибка при удалении теста" }, { status: 500 })
  }
}
