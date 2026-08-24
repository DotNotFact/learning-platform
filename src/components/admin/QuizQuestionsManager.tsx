"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Trash2, Edit, FileQuestion } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { v4 as uuidv4 } from "uuid"

const questionSchema = z.object({
  text: z.string().min(1, "Текст вопроса обязателен"),
  options: z
    .array(
      z.object({
        optionUid: z.string(),
        text: z.string().min(1, "Текст варианта обязателен"),
      })
    )
    .min(2, "Минимум 2 варианта ответа"),
  correctOptions: z.array(z.string()).min(1, "Выберите хотя бы один правильный ответ"),
  explanation: z.string().optional(),
  orderIndex: z.number().int().min(0).default(0),
})

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
  orderIndex: number
}

interface QuizQuestionsManagerProps {
  quizUid: string
  quizTitle: string
  initialQuestions: Question[]
}

export function QuizQuestionsManager({
  quizUid,
  quizTitle,
  initialQuestions,
}: QuizQuestionsManagerProps) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)

  const form = useForm<z.input<typeof questionSchema>, unknown, z.infer<typeof questionSchema>>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      text: "",
      options: [{ optionUid: uuidv4(), text: "" }],
      correctOptions: [],
      explanation: "",
      orderIndex: 0,
    },
  })

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control: form.control,
    name: "options",
  })

  useEffect(() => {
    if (editingQuestion) {
      form.reset({
        text: editingQuestion.text,
        options: editingQuestion.options,
        correctOptions: editingQuestion.correctOptions,
        explanation: editingQuestion.explanation || "",
        orderIndex: editingQuestion.orderIndex,
      })
    } else {
      form.reset({
        text: "",
        options: [{ optionUid: uuidv4(), text: "" }],
        correctOptions: [],
        explanation: "",
        orderIndex: questions.length,
      })
    }
  }, [editingQuestion, form, questions.length])

  const handleSubmit = async (values: z.infer<typeof questionSchema>) => {
    try {
      // Генерируем UUID для новых опций, если их нет
      const optionsWithUuids = values.options.map((opt) => ({
        optionUid: opt.optionUid || uuidv4(),
        text: opt.text,
      }))

      const url = editingQuestion
        ? `/api/questions/${editingQuestion.questionUid}`
        : `/api/quizzes/${quizUid}/questions`
      const method = editingQuestion ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          options: optionsWithUuids,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || "Ошибка при сохранении вопроса")
        return
      }

      const data = await response.json()
      // API возвращает вопрос с уже распарсенными JSON строками
      const question = {
        ...data.question,
        options: Array.isArray(data.question.options)
          ? data.question.options
          : typeof data.question.options === "string"
            ? JSON.parse(data.question.options)
            : [],
        correctOptions: Array.isArray(data.question.correctOptions)
          ? data.question.correctOptions
          : typeof data.question.correctOptions === "string"
            ? JSON.parse(data.question.correctOptions)
            : [],
      }

      if (editingQuestion) {
        setQuestions(questions.map((q) => (q.questionUid === editingQuestion.questionUid ? question : q)))
      } else {
        setQuestions([...questions, question].sort((a, b) => a.orderIndex - b.orderIndex))
      }

      form.reset()
      setIsDialogOpen(false)
      setEditingQuestion(null)
    } catch {
      alert("Ошибка при сохранении вопроса")
    }
  }

  const handleDelete = async (questionUid: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот вопрос?")) return

    try {
      const response = await fetch(`/api/questions/${questionUid}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setQuestions(questions.filter((q) => q.questionUid !== questionUid))
      } else {
        alert("Ошибка при удалении вопроса")
      }
    } catch {
      alert("Ошибка при удалении вопроса")
    }
  }

  const toggleCorrectOption = (optionUid: string) => {
    const currentCorrect = form.getValues("correctOptions") || []
    const newCorrect = currentCorrect.includes(optionUid)
      ? currentCorrect.filter((id) => id !== optionUid)
      : [...currentCorrect, optionUid]
    form.setValue("correctOptions", newCorrect)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{quizTitle}</h2>
          <p className="text-muted-foreground">Вопросов: {questions.length}</p>
        </div>
        <Button
          onClick={() => {
            setEditingQuestion(null)
            setIsDialogOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Добавить вопрос
        </Button>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Нет вопросов в тесте</p>
          <p className="text-sm text-muted-foreground mt-2">Добавьте первый вопрос</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Порядок</TableHead>
                <TableHead>Текст вопроса</TableHead>
                <TableHead>Вариантов</TableHead>
                <TableHead>Правильных</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((question) => (
                <TableRow key={question.questionUid}>
                  <TableCell>{question.orderIndex}</TableCell>
                  <TableCell className="font-medium max-w-md truncate">{question.text}</TableCell>
                  <TableCell>{question.options.length}</TableCell>
                  <TableCell>{question.correctOptions.length}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingQuestion(question)
                          setIsDialogOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(question.questionUid)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? "Редактировать вопрос" : "Добавить вопрос"}
            </DialogTitle>
            <DialogDescription>
              {editingQuestion
                ? "Измените информацию о вопросе"
                : "Заполните информацию о новом вопросе"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Текст вопроса</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Варианты ответов</FormLabel>
                <div className="space-y-2 mt-2">
                  {optionFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-start">
                      <FormField
                        control={form.control}
                        name={`options.${index}.text`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input {...field} placeholder={`Вариант ${index + 1}`} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const currentOptionUid = form.getValues(`options.${index}.optionUid`)
                          if (!currentOptionUid) {
                            // Если нет UUID, генерируем и сохраняем
                            const newUuid = uuidv4()
                            form.setValue(`options.${index}.optionUid`, newUuid)
                            toggleCorrectOption(newUuid)
                          } else {
                            toggleCorrectOption(currentOptionUid)
                          }
                        }}
                        className={
                          form.watch("correctOptions")?.includes(
                            form.getValues(`options.${index}.optionUid`) || ""
                          )
                            ? "bg-green-100 border-green-500"
                            : ""
                        }
                        title="Отметить как правильный"
                      >
                        ✓
                      </Button>
                      {optionFields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const optionUid = form.getValues(`options.${index}.optionUid`)
                            if (optionUid) {
                              const currentCorrect = form.getValues("correctOptions") || []
                              form.setValue(
                                "correctOptions",
                                currentCorrect.filter((id) => id !== optionUid)
                              )
                            }
                            removeOption(index)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendOption({ optionUid: uuidv4(), text: "" })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить вариант
                  </Button>
                </div>
                {form.formState.errors.options && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.options.message}
                  </p>
                )}
                {form.formState.errors.correctOptions && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.correctOptions.message}
                  </p>
                )}
              </div>

              <FormField
                control={form.control}
                name="explanation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Объяснение (опционально)</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="orderIndex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Порядок</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit">{editingQuestion ? "Сохранить" : "Создать"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
