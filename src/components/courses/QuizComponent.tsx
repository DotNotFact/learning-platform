"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, RotateCcw, Trophy } from "lucide-react"

interface Option {
  optionUid: string
  text: string
}

interface Question {
  questionUid: string
  text: string
  options: Option[]
  correctOptions: string[]
  explanation?: string | null
}

interface QuizComponentProps {
  quizUid: string
  title: string
  description?: string | null
  questions: Question[]
}

interface PreviousAttempt {
  attemptUid: string
  score: number
  totalQuestions: number
  percentage: number
  completedAt: string
}

export function QuizComponent({
  quizUid,
  title,
  description,
  questions,
}: QuizComponentProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({})
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<Record<string, boolean>>({})
  const [, setPreviousAttempts] = useState<PreviousAttempt[]>([])
  const [bestAttempt, setBestAttempt] = useState<PreviousAttempt | null>(null)
  const [loadingAttempts, setLoadingAttempts] = useState(true)
  const startTimeRef = useRef<number>(Date.now())

  // Загружаем предыдущие попытки
  useEffect(() => {
    const loadAttempts = async () => {
      try {
        const response = await fetch(`/api/quizzes/${quizUid}/attempt`)
        if (response.ok) {
          const data = await response.json()
          if (data.attempts && data.attempts.length > 0) {
            setPreviousAttempts(data.attempts)
            // Находим лучший результат
            const best = data.attempts.reduce((prev: PreviousAttempt, current: PreviousAttempt) => 
              current.percentage > prev.percentage ? current : prev
            )
            setBestAttempt(best)
          }
        }
      } catch (error) {
        console.error("Ошибка при загрузке предыдущих попыток:", error)
      } finally {
        setLoadingAttempts(false)
      }
    }
    loadAttempts()
  }, [quizUid])

  // Защита от пустого массива вопросов (после хуков!)
  if (!questions || questions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">В этом тесте пока нет вопросов.</p>
        </CardContent>
      </Card>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1

  const handleRestart = () => {
    setCurrentQuestionIndex(0)
    setSelectedOptions({})
    setShowResults(false)
    setResults({})
    startTimeRef.current = Date.now()
  }

  const handleOptionToggle = (optionUid: string) => {
    const currentSelections = selectedOptions[currentQuestion.questionUid] || []
    const newSelections = currentSelections.includes(optionUid)
      ? currentSelections.filter((id) => id !== optionUid)
      : [...currentSelections, optionUid]

    setSelectedOptions({
      ...selectedOptions,
      [currentQuestion.questionUid]: newSelections,
    })
  }

  const handleNext = () => {
    if (isLastQuestion) {
      calculateResults()
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const calculateResults = () => {
    const newResults: Record<string, boolean> = {}
    let score = 0

    questions.forEach((question) => {
      const selected = selectedOptions[question.questionUid] || []
      const correct = question.correctOptions
      const isCorrect =
        selected.length === correct.length && selected.every((id) => correct.includes(id))

      newResults[question.questionUid] = isCorrect
      if (isCorrect) score++
    })

    setResults(newResults)
    setShowResults(true)

    const percentage = questions.length > 0 ? (score / questions.length) * 100 : 0
    const timeSpent = Math.max(0, Math.round((Date.now() - startTimeRef.current) / 1000))
    const answers = questions.map((question) => ({
      questionUid: question.questionUid,
      selectedOptions: selectedOptions[question.questionUid] || [],
    }))
    
    // Сохраняем результат в базу данных
    fetch(`/api/quizzes/${quizUid}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score,
        totalQuestions: questions.length,
        percentage,
        timeSpent,
        answers,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        // Обновляем список попыток после сохранения
        if (data.attempt) {
          setPreviousAttempts((prev) => [data.attempt, ...prev])
          // Обновляем лучший результат, если текущий лучше
          if (!bestAttempt || percentage > bestAttempt.percentage) {
            setBestAttempt(data.attempt)
          }
        }
      })
      .catch(() => {
        // Игнорируем ошибки сохранения результата
      })
  }

  if (showResults) {
    const score = Object.values(results).filter(Boolean).length
    const total = questions.length
    const percentage = (score / total) * 100

    // Определяем цвет в зависимости от процента
    let scoreColor = "text-red-600"
    let scoreBgColor = "bg-red-50"
    let scoreBorderColor = "border-red-200"
    if (percentage >= 80) {
      scoreColor = "text-green-600"
      scoreBgColor = "bg-green-50"
      scoreBorderColor = "border-green-200"
    } else if (percentage >= 50) {
      scoreColor = "text-yellow-600"
      scoreBgColor = "bg-yellow-50"
      scoreBorderColor = "border-yellow-200"
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Результаты теста</CardTitle>
          <CardDescription>
            Вы ответили правильно на {score} из {total} вопросов
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bestAttempt && bestAttempt.percentage > percentage && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
              <Trophy className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Ваш лучший результат:</p>
                <p className="text-sm text-blue-700">
                  {bestAttempt.score}/{bestAttempt.totalQuestions} ({bestAttempt.percentage.toFixed(0)}%)
                </p>
              </div>
            </div>
          )}
          <div className={`text-center p-6 rounded-lg border-2 ${scoreBgColor} ${scoreBorderColor}`}>
            <div className={`text-5xl font-bold mb-2 ${scoreColor}`}>
              {score}/{total}
            </div>
            <div className={`text-3xl font-semibold ${scoreColor}`}>
              {percentage.toFixed(0)}%
            </div>
          </div>
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div
                key={question.questionUid}
                className={`p-4 rounded-lg border ${
                  results[question.questionUid]
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-start gap-2">
                  {results[question.questionUid] ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">
                      Вопрос {index + 1}: {question.text}
                    </p>
                    {question.explanation && (
                      <p className="text-sm text-muted-foreground mt-2">{question.explanation}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center pt-4">
            <Button onClick={handleRestart} variant="outline" size="lg">
              <RotateCcw className="h-4 w-4 mr-2" />
              Пройти заново
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
            <CardDescription>
              Вопрос {currentQuestionIndex + 1} из {questions.length}
            </CardDescription>
          </div>
          {!loadingAttempts && bestAttempt && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Лучший результат:</p>
              <p className="text-sm font-semibold">
                {bestAttempt.score}/{bestAttempt.totalQuestions} ({bestAttempt.percentage.toFixed(0)}%)
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-4">{currentQuestion.text}</h3>
          <div className="space-y-2">
            {currentQuestion.options.map((option) => {
              const isSelected = (selectedOptions[currentQuestion.questionUid] || []).includes(
                option.optionUid
              )

              return (
                <button
                  key={option.optionUid}
                  onClick={() => handleOptionToggle(option.optionUid)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-gray-200 hover:border-primary/50"
                  }`}
                >
                  {option.text}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleNext}>
            {isLastQuestion ? "Завершить тест" : "Следующий вопрос"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
