import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import * as z from "zod"

const optionSchema = z.object({
  optionUid: z.string().uuid(),
  text: z.string().min(1),
})

const updateQuestionSchema = z.object({
  text: z.string().min(1).optional(),
  options: z.array(optionSchema).min(2).optional(),
  correctOptions: z.array(z.string().uuid()).min(1).optional(),
  explanation: z.string().optional(),
  orderIndex: z.number().int().min(0).optional(),
})

export async function GET(
  req: Request,
  { params }: { params: Promise<{ questionUid: string }> | { questionUid: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const question = await db.question.findUnique({
      where: {
        questionUid: resolvedParams.questionUid,
      },
      include: {
        quiz: {
          select: {
            quizUid: true,
            title: true,
            course: {
              select: {
                courseUid: true,
                title: true,
              },
            },
          },
        },
      },
    })

    if (!question) {
      return NextResponse.json({ error: "Вопрос не найден" }, { status: 404 })
    }

    const questionResponse = {
      ...question,
      options: JSON.parse(question.options),
      correctOptions: JSON.parse(question.correctOptions),
    }

    return NextResponse.json({ question: questionResponse })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Произошла ошибка при получении вопроса" }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ questionUid: string }> | { questionUid: string } }
) {
  try {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })
    }

    const resolvedParams = await Promise.resolve(params)
    const body = await req.json()
    const data = updateQuestionSchema.parse(body)

    // Если обновляются опции и правильные ответы, проверяем валидность
    if (data.options && data.correctOptions) {
      const optionUids = data.options.map((opt) => opt.optionUid)
      const invalidCorrectOptions = data.correctOptions.filter((uid) => !optionUids.includes(uid))

      if (invalidCorrectOptions.length > 0) {
        return NextResponse.json(
          { error: "Некоторые правильные ответы не найдены в списке опций" },
          { status: 400 }
        )
      }
    }

    const updateData: {
      text?: string
      options?: string
      correctOptions?: string
      explanation?: string
      orderIndex?: number
    } = {}
    if (data.text !== undefined) updateData.text = data.text
    if (data.options) {
      updateData.options = JSON.stringify(data.options)
    }
    if (data.correctOptions) {
      updateData.correctOptions = JSON.stringify(data.correctOptions)
    }
    if (data.explanation !== undefined) updateData.explanation = data.explanation
    if (data.orderIndex !== undefined) updateData.orderIndex = data.orderIndex

    const question = await db.question.update({
      where: {
        questionUid: resolvedParams.questionUid,
      },
      data: updateData,
    })

    const questionResponse = {
      ...question,
      options: JSON.parse(question.options),
      correctOptions: JSON.parse(question.correctOptions),
    }

    return NextResponse.json({ question: questionResponse })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные", details: error.issues }, { status: 400 })
    }

    return NextResponse.json({ error: "Произошла ошибка при обновлении вопроса" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ questionUid: string }> | { questionUid: string } }
) {
  try {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })
    }

    const resolvedParams = await Promise.resolve(params)
    await db.question.delete({
      where: {
        questionUid: resolvedParams.questionUid,
      },
    })

    return NextResponse.json({ message: "Вопрос удален" })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Произошла ошибка при удалении вопроса" }, { status: 500 })
  }
}
