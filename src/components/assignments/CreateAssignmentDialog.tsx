"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CopyLinkButton } from "@/components/assignments/CopyLinkButton"
import { Loader2, PlusCircle } from "lucide-react"

const assignmentFormSchema = z.object({
  title: z.string().min(1, "Введите название"),
  description: z.string().max(2000).optional(),
  instructions: z.string().max(20000).optional(),
  dueDate: z.string().optional(),
  maxScore: z.coerce.number().int().min(1).max(1000),
  lessonUid: z.string().optional(),
  quizUid: z.string().optional(),
  videoUrl: z.string().url("Неверный URL видео").optional().or(z.literal("")),
  imageUrl: z.string().url("Неверный URL изображения").optional().or(z.literal("")),
  resourceUrl: z.string().url("Неверный URL ресурса").optional().or(z.literal("")),
  meetingUrl: z.string().url("Неверный URL встречи").optional().or(z.literal("")),
})

type AssignmentFormValues = z.infer<typeof assignmentFormSchema>

interface LessonOption {
  lessonUid: string
  title: string
  courseTitle: string
}

interface QuizOption {
  quizUid: string
  title: string
  courseTitle: string
}

interface CreateAssignmentDialogProps {
  lessons: LessonOption[]
  quizzes: QuizOption[]
}

export function CreateAssignmentDialog({ lessons, quizzes }: CreateAssignmentDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdAssignment, setCreatedAssignment] = useState<{ assignmentUid: string; title: string } | null>(null)
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  const form = useForm<z.input<typeof assignmentFormSchema>, unknown, AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      title: "",
      description: "",
      instructions: "",
      dueDate: "",
      maxScore: 100,
      lessonUid: "none",
      quizUid: "none",
      videoUrl: "",
      imageUrl: "",
      resourceUrl: "",
      meetingUrl: "",
    },
  })

  const shareLink = useMemo(() => {
    if (!createdAssignment || !origin) return ""
    return `${origin}/assignments/${createdAssignment.assignmentUid}`
  }, [createdAssignment, origin])

  const onSubmit = async (data: AssignmentFormValues) => {
    try {
      setIsSubmitting(true)
      const payload = {
        title: data.title,
        description: data.description || null,
        instructions: data.instructions || null,
        dueDate: data.dueDate || null,
        maxScore: data.maxScore,
        lessonUid: data.lessonUid && data.lessonUid !== "none" ? data.lessonUid : null,
        quizUid: data.quizUid && data.quizUid !== "none" ? data.quizUid : null,
        videoUrl: data.videoUrl || null,
        imageUrl: data.imageUrl || null,
        resourceUrl: data.resourceUrl || null,
        meetingUrl: data.meetingUrl || null,
      }

      const response = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result?.error || "Ошибка при создании задания")
      }

      setCreatedAssignment({
        assignmentUid: result.assignment.assignmentUid,
        title: result.assignment.title,
      })
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Не удалось создать задание")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (!value) {
      setCreatedAssignment(null)
      form.reset()
    }
  }

  return (
    <div>
      <Button onClick={() => setOpen(true)}>
        <PlusCircle className="h-4 w-4 mr-2" />
        Создать задание
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[760px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Новое задание</DialogTitle>
            <DialogDescription>
              Создайте задание с инструкциями, материалами и опциональным тестом.
            </DialogDescription>
          </DialogHeader>

          {createdAssignment ? (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground mb-1">Задание создано</div>
                <div className="text-lg font-semibold">{createdAssignment.title}</div>
              </div>
              {shareLink && (
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="text-sm text-muted-foreground">Ссылка для студентов</div>
                  <div className="text-sm font-medium break-all">{shareLink}</div>
                  <CopyLinkButton value={shareLink} />
                </div>
              )}
              <DialogFooter>
                <LinkToAssignment assignmentUid={createdAssignment.assignmentUid} />
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  Закрыть
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название</FormLabel>
                      <FormControl>
                        <Input placeholder="Например, Домашнее задание №1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Краткое описание</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Опишите цель задания..."
                          className="min-h-[80px]"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Инструкция</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Подробные инструкции для студентов"
                          className="min-h-[120px]"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Срок сдачи</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Макс. балл</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={1000} {...field} value={field.value as number} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="lessonUid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Привязать к уроку</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "none"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Без урока" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Без урока</SelectItem>
                            {lessons.map((lesson) => (
                              <SelectItem key={lesson.lessonUid} value={lesson.lessonUid}>
                                {lesson.courseTitle}: {lesson.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quizUid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Контрольная/тест</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "none"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Без теста" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Без теста</SelectItem>
                            {quizzes.map((quiz) => (
                              <SelectItem key={quiz.quizUid} value={quiz.quizUid}>
                                {quiz.courseTitle}: {quiz.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="text-sm font-semibold text-muted-foreground">Материалы</div>
                  <FormField
                    control={form.control}
                    name="videoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Видео</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Изображение</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="resourceUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Материал/файл</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="meetingUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ссылка на встречу (Zoom/Meet)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
                    Отмена
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Создание...
                      </>
                    ) : (
                      "Создать"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LinkToAssignment({ assignmentUid }: { assignmentUid: string }) {
  return (
    <Button asChild>
      <a href={`/assignments/${assignmentUid}`}>Открыть задание</a>
    </Button>
  )
}
