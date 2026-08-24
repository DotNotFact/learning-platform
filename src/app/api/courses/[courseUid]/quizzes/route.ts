import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import * as z from "zod"

const createQuizSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseUid: string }> | { courseUid: string } }
) {
  try {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })
    }

    const resolvedParams = await Promise.resolve(params)
    const body = await req.json()
    const data = createQuizSchema.parse(body)

    // Проверяем, что курс существует
    const course = await db.course.findUnique({
      where: { courseUid: resolvedParams.courseUid },
    })

    if (!course) {
      return NextResponse.json({ error: "Курс не найден" }, { status: 404 })
    }

    const quiz = await db.quiz.create({
      data: {
        title: data.title,
        description: data.description,
        courseUid: resolvedParams.courseUid,
      },
      include: {
        questions: true,
      },
    })

    return NextResponse.json({ quiz }, { status: 201 })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные", details: error.issues }, { status: 400 })
    }

    return NextResponse.json({ error: "Произошла ошибка при создании теста" }, { status: 500 })
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseUid: string }> | { courseUid: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)

    const quizzes = await db.quiz.findMany({
      where: {
        courseUid: resolvedParams.courseUid,
      },
      include: {
        questions: {
          orderBy: {
            orderIndex: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    const quizzesResponse = quizzes.map((quiz: { questions: Array<{ options: string; correctOptions: string }> }) => ({
      ...quiz,
      questions: quiz.questions.map((q: { options: string; correctOptions: string }) => ({
        ...q,
        options: JSON.parse(q.options),
        correctOptions: JSON.parse(q.correctOptions),
      })),
    }))

    return NextResponse.json({ quizzes: quizzesResponse })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Произошла ошибка при получении тестов" }, { status: 500 })
  }
}
