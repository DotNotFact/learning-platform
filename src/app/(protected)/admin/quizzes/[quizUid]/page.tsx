import { requireAdmin } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { QuizQuestionsManager } from "@/components/admin/QuizQuestionsManager"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface QuizPageProps {
  params: Promise<{ quizUid: string }> | { quizUid: string }
}

export default async function QuizManagementPage({ params }: QuizPageProps) {
  await requireAdmin()

  const resolvedParams = await Promise.resolve(params)
  const quiz = await db.quiz.findUnique({
    where: {
      quizUid: resolvedParams.quizUid,
    },
    include: {
      course: {
        select: {
          courseUid: true,
          title: true,
        },
      },
      questions: {
        orderBy: {
          orderIndex: "asc",
        },
      },
    },
  })

  if (!quiz) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/admin">
          <Button variant="ghost">← Назад к админ-панели</Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Управление вопросами теста</h1>
        <p className="text-muted-foreground">
          Тест: {quiz.title} | Курс: {quiz.course.title}
        </p>
      </div>

      <QuizQuestionsManager
        quizUid={quiz.quizUid}
        quizTitle={quiz.title}
        initialQuestions={quiz.questions.map((q: { questionUid: string; text: string; options: string; correctOptions: string; explanation: string | null; orderIndex: number }) => ({
          questionUid: q.questionUid,
          text: q.text,
          options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
          correctOptions:
            typeof q.correctOptions === "string" ? JSON.parse(q.correctOptions) : q.correctOptions,
          explanation: q.explanation,
          orderIndex: q.orderIndex,
        }))}
      />
    </div>
  )
}
