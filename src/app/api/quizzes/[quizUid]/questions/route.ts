import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import * as z from "zod"

const optionSchema = z.object({
  optionUid: z.string().uuid(),
  text: z.string().min(1),
})

const createQuestionSchema = z.object({
  text: z.string().min(1),
  options: z.array(optionSchema).min(2),
  correctOptions: z.array(z.string().uuid()).min(1),
  explanation: z.string().optional(),
  orderIndex: z.number().int().min(0).default(0),
})

export async function POST(
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
    const data = createQuestionSchema.parse(body)

    // Проверяем, что все правильные ответы есть в списке опций
    const optionUids = data.options.map((opt) => opt.optionUid)
    const invalidCorrectOptions = data.correctOptions.filter((uid) => !optionUids.includes(uid))

    if (invalidCorrectOptions.length > 0) {
      return NextResponse.json(
        { error: "Некоторые правильные ответы не найдены в списке опций" },
        { status: 400 }
      )
    }

    // Проверяем, что тест существует
    const quiz = await db.quiz.findUnique({
      where: { quizUid: resolvedParams.quizUid },
    })

    if (!quiz) {
      return NextResponse.json({ error: "Тест не найден" }, { status: 404 })
    }

    const question = await db.question.create({
      data: {
        text: data.text,
        options: JSON.stringify(data.options),
        correctOptions: JSON.stringify(data.correctOptions),
        explanation: data.explanation,
        orderIndex: data.orderIndex,
        quizUid: resolvedParams.quizUid,
      },
    })

    const questionResponse = {
      ...question,
      options: JSON.parse(question.options),
      correctOptions: JSON.parse(question.correctOptions),
    }

    return NextResponse.json({ question: questionResponse }, { status: 201 })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные", details: error.issues }, { status: 400 })
    }

    return NextResponse.json({ error: "Произошла ошибка при создании вопроса" }, { status: 500 })
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ quizUid: string }> | { quizUid: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)

    const questions = await db.question.findMany({
      where: {
        quizUid: resolvedParams.quizUid,
      },
      orderBy: {
        orderIndex: "asc",
      },
    })

    const questionsResponse = questions.map((q: { options: string; correctOptions: string }) => ({
      ...q,
      options: JSON.parse(q.options),
      correctOptions: JSON.parse(q.correctOptions),
    }))

    return NextResponse.json({ questions: questionsResponse })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Произошла ошибка при получении вопросов" }, { status: 500 })
  }
}
