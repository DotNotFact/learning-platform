"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, Eye, Settings } from "lucide-react"
import { EditCourseDialog } from "./EditCourseDialog"
import { CourseContentManager } from "./CourseContentManager"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useState } from "react"
import Link from "next/link"
import type { CourseDetails } from "@/types"
import { useToastContext } from "@/components/ToastProvider"

interface CoursesTableProps {
  courses: CourseDetails[]
  onUpdate: (course: CourseDetails) => void
  onDelete: (courseUid: string) => void
}

export function CoursesTable({ courses, onUpdate, onDelete }: CoursesTableProps) {
  const [editingCourse, setEditingCourse] = useState<CourseDetails | null>(null)
  const [managingContent, setManagingContent] = useState<CourseDetails | null>(null)
  const { showToast } = useToastContext()

  const handleDelete = async (courseUid: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот курс? Это действие нельзя отменить.")) return

    try {
      const response = await fetch(`/api/courses/${courseUid}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Закрываем диалог управления контентом, если удаляемый курс открыт
        if (managingContent?.courseUid === courseUid) {
          setManagingContent(null)
        }
        // Закрываем диалог редактирования, если удаляемый курс открыт
        if (editingCourse?.courseUid === courseUid) {
          setEditingCourse(null)
        }
        showToast("Курс успешно удален", "success")
        onDelete(courseUid)
      } else {
        const data = await response.json().catch(() => ({ error: "Неизвестная ошибка" }))
        showToast(data.error || "Ошибка при удалении курса", "error")
      }
    } catch (error) {
      console.error("Ошибка при удалении курса:", error)
      showToast("Ошибка при удалении курса", "error")
    }
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Автор</TableHead>
              <TableHead>Видео</TableHead>
              <TableHead>Тесты</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">📚</span>
                    <p className="text-lg font-medium">Нет курсов</p>
                    <p className="text-sm">Создайте первый курс, чтобы начать</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course) => (
                <TableRow 
                  key={course.courseUid}
                  className="hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <TableCell className="font-medium">{course.title}</TableCell>
                  <TableCell>{course.author.name || course.author.email}</TableCell>
                  <TableCell>{course.videos?.length || 0}</TableCell>
                  <TableCell>{course.quizzes.length}</TableCell>
                  <TableCell>
                    <Badge variant={course.isPublished ? "default" : "secondary"}>
                      {course.isPublished ? "Опубликован" : "Черновик"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/courses/${course.courseUid}?returnTo=/admin`}>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Просмотр"
                          className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setManagingContent(course)}
                        title="Управление контентом"
                        className="hover:bg-purple-50 hover:text-purple-600 transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingCourse(course)}
                        title="Редактировать"
                        className="hover:bg-green-50 hover:text-green-600 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(course.courseUid)}
                        title="Удалить"
                        className="hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {editingCourse && (
        <EditCourseDialog
          course={editingCourse}
          open={!!editingCourse}
          onOpenChange={(open) => !open && setEditingCourse(null)}
          onCourseUpdated={onUpdate}
        />
      )}
      {managingContent && (
        <Dialog open={!!managingContent} onOpenChange={(open) => !open && setManagingContent(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Управление контентом: {managingContent.title}</DialogTitle>
              <DialogDescription>Добавляйте и редактируйте видео уроки и тесты</DialogDescription>
            </DialogHeader>
            <CourseContentManager
              courseUid={managingContent.courseUid}
              initialVideos={managingContent.videos || []}
              initialQuizzes={managingContent.quizzes.map((q) => ({
                quizUid: q.quizUid,
                title: q.title,
                description: q.description,
                questions: Array.isArray(q.questions) ? q.questions : [],
              }))}
              onUpdate={async () => {
                // Обновляем данные курса
                try {
                  const response = await fetch(`/api/courses/${managingContent.courseUid}`)
                  if (response.ok) {
                    const data = await response.json()
                    const updatedCourse = {
                      ...data.course,
                      videos: data.course.videos || [],
                      quizzes: data.course.quizzes.map((quiz: {
                        quizUid: string
                        title: string
                        description: string | null
                        questions: Array<{
                          options: string | unknown[]
                          correctOptions: string | unknown[]
                          [key: string]: unknown
                        }>
                      }) => ({
                        ...quiz,
                        questions: quiz.questions.map((q: { options: string | unknown[]; correctOptions: string | unknown[] }) => ({
                          ...q,
                          options:
                            typeof q.options === "string" ? JSON.parse(q.options) : q.options,
                          correctOptions:
                            typeof q.correctOptions === "string"
                              ? JSON.parse(q.correctOptions as string)
                              : q.correctOptions,
                        })),
                      })),
                    }
                    setManagingContent(updatedCourse)
                    onUpdate(updatedCourse)
                  }
                } catch {
                  // Игнорируем ошибки обновления
                }
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
