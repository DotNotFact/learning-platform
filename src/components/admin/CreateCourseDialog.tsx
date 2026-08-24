"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToastContext } from "@/components/ToastProvider"
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import type { CourseListItem } from "@/types"

const courseSchema = z.object({
  title: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
  thumbnailUrl: z.string().url("Неверный URL").optional().or(z.literal("")),
  isPublished: z.boolean().default(false),
  orderIndex: z.number().int().min(0).default(0),
})

interface CreateCourseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCourseCreated: (course: CourseListItem) => void
}

export function CreateCourseDialog({
  open,
  onOpenChange,
  onCourseCreated,
}: CreateCourseDialogProps) {
  const [loading, setLoading] = useState(false)
  const { showToast } = useToastContext()

  const form = useForm<z.input<typeof courseSchema>, unknown, z.infer<typeof courseSchema>>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      description: "",
      thumbnailUrl: "",
      isPublished: false,
      orderIndex: 0,
    },
  })

  async function onSubmit(values: z.infer<typeof courseSchema>) {
    try {
      setLoading(true)
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (!response.ok) {
        showToast(data.error || "Ошибка при создании курса", "error")
        return
      }

      showToast("Курс успешно создан!", "success")
      onCourseCreated(data.course)
      form.reset()
      onOpenChange(false)
    } catch (error) {
      showToast("Ошибка при создании курса", "error")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Создать курс</DialogTitle>
          <DialogDescription>Заполните информацию о новом курсе</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
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
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="thumbnailUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL изображения</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://example.com/image.jpg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isPublished"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </FormControl>
                  <FormLabel className="mt-0!">Опубликовать сразу</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="orderIndex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Порядок сортировки</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      min={0}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Создание..." : "Создать"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
