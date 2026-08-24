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
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Video, FileQuestion, Trash2, Edit } from "lucide-react"
import { QuizQuestionsManager } from "./QuizQuestionsManager"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const videoSchema = z.object({
  title: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
  videoUrl: z.string().url("Неверный URL"),
  duration: z.number().int().positive().optional(),
  orderIndex: z.number().int().min(0).default(0),
})

const quizSchema = z.object({
  title: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
})

interface Video {
  videoUid: string
  title: string
  description?: string | null
  videoUrl: string
  duration?: number | null
  orderIndex: number
}

interface Quiz {
  quizUid: string
  title: string
  description?: string | null
  questions: Question[]
}

interface Question {
  questionUid: string
  text: string
  options: string | Array<{ optionUid: string; text: string }>
  correctOptions: string | string[]
  explanation?: string | null
  orderIndex: number
}

interface CourseContentManagerProps {
  courseUid: string
  initialVideos: Video[]
  initialQuizzes: Quiz[]
  onUpdate: () => void
}

export function CourseContentManager({
  courseUid,
  initialVideos,
  initialQuizzes,
  onUpdate,
}: CourseContentManagerProps) {
  const [videos, setVideos] = useState<Video[]>(initialVideos)
  const [quizzes, setQuizzes] = useState<Quiz[]>(initialQuizzes)
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false)
  const [isQuizDialogOpen, setIsQuizDialogOpen] = useState(false)
  const [isQuestionsDialogOpen, setIsQuestionsDialogOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null)
  const [managingQuiz, setManagingQuiz] = useState<Quiz | null>(null)

  const videoForm = useForm<z.input<typeof videoSchema>, unknown, z.infer<typeof videoSchema>>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      title: "",
      description: "",
      videoUrl: "",
      duration: undefined,
      orderIndex: 0,
    },
  })

  const quizForm = useForm<z.input<typeof quizSchema>, unknown, z.infer<typeof quizSchema>>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  })

  useEffect(() => {
    if (editingVideo) {
      videoForm.reset({
        title: editingVideo.title,
        description: editingVideo.description || "",
        videoUrl: editingVideo.videoUrl,
        duration: editingVideo.duration || undefined,
        orderIndex: editingVideo.orderIndex,
      })
    }
  }, [editingVideo, videoForm])

  useEffect(() => {
    if (editingQuiz) {
      quizForm.reset({
        title: editingQuiz.title,
        description: editingQuiz.description || "",
      })
    }
  }, [editingQuiz, quizForm])

  const handleVideoSubmit = async (values: z.infer<typeof videoSchema>) => {
    try {
      const url = editingVideo
        ? `/api/videos/${editingVideo.videoUid}`
        : `/api/courses/${courseUid}/videos`
      const method = editingVideo ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || "Ошибка при сохранении видео")
        return
      }

      const data = await response.json()
      if (editingVideo) {
        setVideos(videos.map((v) => (v.videoUid === editingVideo.videoUid ? data.video : v)))
      } else {
        setVideos([...videos, data.video].sort((a, b) => a.orderIndex - b.orderIndex))
      }

      videoForm.reset()
      setIsVideoDialogOpen(false)
      setEditingVideo(null)
      onUpdate()
    } catch {
      alert("Ошибка при сохранении видео")
    }
  }

  const handleQuizSubmit = async (values: z.infer<typeof quizSchema>) => {
    try {
      const url = editingQuiz
        ? `/api/quizzes/${editingQuiz.quizUid}`
        : `/api/courses/${courseUid}/quizzes`
      const method = editingQuiz ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || "Ошибка при сохранении теста")
        return
      }

      const data = await response.json()
      if (editingQuiz) {
        setQuizzes(quizzes.map((q) => (q.quizUid === editingQuiz.quizUid ? data.quiz : q)))
      } else {
        setQuizzes([...quizzes, { ...data.quiz, questions: [] }])
      }

      quizForm.reset()
      setIsQuizDialogOpen(false)
      setEditingQuiz(null)
      onUpdate()
    } catch {
      alert("Ошибка при сохранении теста")
    }
  }

  const handleDeleteVideo = async (videoUid: string) => {
    if (!confirm("Вы уверены, что хотите удалить это видео?")) return

    try {
      const response = await fetch(`/api/videos/${videoUid}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setVideos(videos.filter((v) => v.videoUid !== videoUid))
        onUpdate()
      } else {
        alert("Ошибка при удалении видео")
      }
    } catch {
      alert("Ошибка при удалении видео")
    }
  }

  const handleDeleteQuiz = async (quizUid: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот тест?")) return

    try {
      const response = await fetch(`/api/quizzes/${quizUid}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setQuizzes(quizzes.filter((q) => q.quizUid !== quizUid))
        onUpdate()
      } else {
        alert("Ошибка при удалении теста")
      }
    } catch {
      alert("Ошибка при удалении теста")
    }
  }

  return (
    <div className="space-y-8">
      {/* Видео */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Video className="h-5 w-5" />
            Видео уроки ({videos.length})
          </h3>
          <Button
            size="sm"
            onClick={() => {
              setEditingVideo(null)
              videoForm.reset()
              setIsVideoDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Добавить видео
          </Button>
        </div>

        {videos.length === 0 ? (
          <p className="text-muted-foreground text-sm">Нет видео уроков</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Длительность</TableHead>
                  <TableHead>Порядок</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.map((video) => (
                  <TableRow key={video.videoUid}>
                    <TableCell className="font-medium">{video.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-xs">
                      {video.videoUrl}
                    </TableCell>
                    <TableCell>{video.duration ? `${video.duration} сек` : "—"}</TableCell>
                    <TableCell>{video.orderIndex}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingVideo(video)
                            setIsVideoDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteVideo(video.videoUid)}
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
      </div>

      {/* Тесты */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <FileQuestion className="h-5 w-5" />
            Тесты ({quizzes.length})
          </h3>
          <Button
            size="sm"
            onClick={() => {
              setEditingQuiz(null)
              quizForm.reset()
              setIsQuizDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Добавить тест
          </Button>
        </div>

        {quizzes.length === 0 ? (
          <p className="text-muted-foreground text-sm">Нет тестов</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Вопросов</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quizzes.map((quiz) => {
                  const questions = Array.isArray(quiz.questions) ? quiz.questions : []
                  return (
                    <TableRow key={quiz.quizUid}>
                      <TableCell className="font-medium">{quiz.title}</TableCell>
                      <TableCell>{questions.length}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            title="Управление вопросами"
                            onClick={() => {
                              setManagingQuiz(quiz)
                              setIsQuestionsDialogOpen(true)
                            }}
                          >
                            Вопросы
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingQuiz(quiz)
                              setIsQuizDialogOpen(true)
                            }}
                            title="Редактировать тест"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteQuiz(quiz.quizUid)}
                            title="Удалить тест"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Диалог добавления/редактирования видео */}
      <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVideo ? "Редактировать видео" : "Добавить видео"}</DialogTitle>
            <DialogDescription>
              {editingVideo
                ? "Измените информацию о видео уроке"
                : "Заполните информацию о новом видео уроке"}
            </DialogDescription>
          </DialogHeader>
          <Form {...videoForm}>
            <form onSubmit={videoForm.handleSubmit(handleVideoSubmit)} className="space-y-4">
              <FormField
                control={videoForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={videoForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={videoForm.control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL видео</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://example.com/video.mp4" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={videoForm.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Длительность (секунды)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={videoForm.control}
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
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsVideoDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit">{editingVideo ? "Сохранить" : "Создать"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Диалог добавления/редактирования теста */}
      <Dialog open={isQuizDialogOpen} onOpenChange={setIsQuizDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingQuiz ? "Редактировать тест" : "Добавить тест"}</DialogTitle>
            <DialogDescription>
              {editingQuiz ? "Измените информацию о тесте" : "Заполните информацию о новом тесте"}
            </DialogDescription>
          </DialogHeader>
          <Form {...quizForm}>
            <form onSubmit={quizForm.handleSubmit(handleQuizSubmit)} className="space-y-4">
              <FormField
                control={quizForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={quizForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsQuizDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit">{editingQuiz ? "Сохранить" : "Создать"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Диалог управления вопросами теста */}
      {managingQuiz && (
        <Dialog
          open={isQuestionsDialogOpen}
          onOpenChange={(open) => {
            setIsQuestionsDialogOpen(open)
            if (!open) {
              setManagingQuiz(null)
              // Обновляем данные теста после закрытия
              const updateQuizData = async () => {
                try {
                  const response = await fetch(`/api/quizzes/${managingQuiz.quizUid}`)
                  if (response.ok) {
                    const data = await response.json()
                    const updatedQuiz = {
                      ...data.quiz,
                      questions: data.quiz.questions.map((q: {
                        options: string | unknown[]
                        correctOptions: string | unknown[]
                        [key: string]: unknown
                      }) => ({
                        ...q,
                        options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
                        correctOptions:
                          typeof q.correctOptions === "string"
                            ? JSON.parse(q.correctOptions as string)
                            : q.correctOptions,
                      })),
                    }
                    setQuizzes(
                      quizzes.map((q) =>
                        q.quizUid === managingQuiz.quizUid ? updatedQuiz : q
                      )
                    )
                    onUpdate()
                  }
                } catch {
                  // Игнорируем ошибки обновления
                }
              }
              updateQuizData()
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Управление вопросами: {managingQuiz.title}</DialogTitle>
              <DialogDescription>Добавляйте и редактируйте вопросы теста</DialogDescription>
            </DialogHeader>
            <QuizQuestionsManager
              quizUid={managingQuiz.quizUid}
              quizTitle={managingQuiz.title}
              initialQuestions={(() => {
                const questions = Array.isArray(managingQuiz.questions) ? managingQuiz.questions : []
                return questions.map((q: {
                  questionUid: string
                  text: string
                  options: string | Array<{ optionUid: string; text: string }>
                  correctOptions: string | string[]
                  explanation?: string | null
                  orderIndex: number
                }) => ({
                  questionUid: q.questionUid,
                  text: q.text,
                  options:
                    typeof q.options === "string" ? JSON.parse(q.options) : q.options,
                  correctOptions:
                    typeof q.correctOptions === "string"
                      ? JSON.parse(q.correctOptions)
                      : q.correctOptions,
                  explanation: q.explanation,
                  orderIndex: q.orderIndex,
                }))
              })()}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
