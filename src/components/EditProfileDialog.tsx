"use client"

import { useState } from "react"
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Loader2 } from "lucide-react"

const profileSchema = z.object({
  name: z.string().min(2, "Имя должно содержать минимум 2 символа").max(100),
  bio: z.string().max(500, "Биография не должна превышать 500 символов").optional().nullable(),
  avatarUrl: z.string().url("Неверный URL аватара").optional().nullable().or(z.literal("")),
  firstName: z.string().max(50).optional().nullable(),
  lastName: z.string().max(50).optional().nullable(),
  middleName: z.string().max(50).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  timezone: z.string().max(50).optional().nullable(),
  organization: z.string().max(120).optional().nullable(),
  position: z.string().max(120).optional().nullable(),
  subjects: z.string().max(200).optional().nullable(),
  gradeLevel: z.string().max(120).optional().nullable(),
  experienceYears: z
    .preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
      z.number().int().min(0).max(80).nullable()
    )
    .optional(),
  education: z.string().max(200).optional().nullable(),
  websiteUrl: z.string().url("Неверный URL сайта").optional().nullable().or(z.literal("")),
  telegram: z.string().max(64).optional().nullable(),
  vk: z.string().url("Неверный URL VK").optional().nullable().or(z.literal("")),
  linkedin: z.string().url("Неверный URL LinkedIn").optional().nullable().or(z.literal("")),
  isProfilePublic: z.boolean().optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>
type ProfileFormInput = z.input<typeof profileSchema>

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    name: string | null
    bio: string | null
    avatarUrl: string | null
    firstName: string | null
    lastName: string | null
    middleName: string | null
    phone: string | null
    city: string | null
    country: string | null
    timezone: string | null
    organization: string | null
    position: string | null
    subjects: string | null
    gradeLevel: string | null
    experienceYears: number | null
    education: string | null
    websiteUrl: string | null
    telegram: string | null
    vk: string | null
    linkedin: string | null
    isProfilePublic: boolean | null
  }
}

export function EditProfileDialog({ open, onOpenChange, user }: EditProfileDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<ProfileFormInput, unknown, ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name || "",
      bio: user.bio || "",
      avatarUrl: user.avatarUrl || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      middleName: user.middleName || "",
      phone: user.phone || "",
      city: user.city || "",
      country: user.country || "",
      timezone: user.timezone || "",
      organization: user.organization || "",
      position: user.position || "",
      subjects: user.subjects || "",
      gradeLevel: user.gradeLevel || "",
      experienceYears: user.experienceYears ?? null,
      education: user.education || "",
      websiteUrl: user.websiteUrl || "",
      telegram: user.telegram || "",
      vk: user.vk || "",
      linkedin: user.linkedin || "",
      isProfilePublic: user.isProfilePublic ?? true,
    },
  })

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Ошибка при обновлении профиля")
      }

      // Обновляем страницу для отображения изменений
      router.refresh()
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating profile:", error)
      alert(error instanceof Error ? error.message : "Не удалось обновить профиль")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[780px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать профиль</DialogTitle>
          <DialogDescription>
            Обновите информацию о себе. Изменения будут видны другим пользователям.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="text-sm font-semibold text-muted-foreground">Публичные данные</div>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Отображаемое имя</FormLabel>
                    <FormControl>
                      <Input placeholder="Ваше имя" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL аватара</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/avatar.jpg"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Вставьте ссылку на изображение для аватара
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Биография</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Расскажите о себе..."
                        className="min-h-[100px]"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      {form.watch("bio")?.length || 0} / 500 символов
                    </p>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="text-sm font-semibold text-muted-foreground">Персональные данные</div>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Фамилия</FormLabel>
                      <FormControl>
                        <Input placeholder="Иванов" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Имя</FormLabel>
                      <FormControl>
                        <Input placeholder="Иван" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="middleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Отчество</FormLabel>
                      <FormControl>
                        <Input placeholder="Иванович" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Телефон</FormLabel>
                      <FormControl>
                        <Input placeholder="+7 900 000-00-00" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Часовой пояс</FormLabel>
                      <FormControl>
                        <Input placeholder="Europe/Moscow" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Город</FormLabel>
                      <FormControl>
                        <Input placeholder="Москва" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Страна</FormLabel>
                      <FormControl>
                        <Input placeholder="Россия" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="text-sm font-semibold text-muted-foreground">Профессиональная информация</div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="organization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Организация</FormLabel>
                      <FormControl>
                        <Input placeholder="Школа / Университет / Компания" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Должность</FormLabel>
                      <FormControl>
                        <Input placeholder="Преподаватель, методист" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="subjects"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Предметы / специализация</FormLabel>
                    <FormControl>
                      <Input placeholder="Математика, физика" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="gradeLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Уровень/класс</FormLabel>
                      <FormControl>
                        <Input placeholder="8 класс / бакалавр" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="experienceYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Опыт (лет)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={80} placeholder="5" {...field} value={(field.value as number | null) ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="education"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Образование</FormLabel>
                    <FormControl>
                      <Input placeholder="МГУ, факультет ..." {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="text-sm font-semibold text-muted-foreground">Ссылки и контакты</div>
              <FormField
                control={form.control}
                name="websiteUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Сайт/портфолио</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="telegram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telegram</FormLabel>
                      <FormControl>
                        <Input placeholder="@username" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vk"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VK</FormLabel>
                      <FormControl>
                        <Input placeholder="https://vk.com/username" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="linkedin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn</FormLabel>
                    <FormControl>
                      <Input placeholder="https://linkedin.com/in/username" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4">
              <FormField
                control={form.control}
                name="isProfilePublic"
                render={({ field }) => (
                  <FormItem className="flex items-start gap-3 rounded-lg border p-3">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-primary"
                        checked={field.value ?? true}
                        onChange={(event) => field.onChange(event.target.checked)}
                      />
                    </FormControl>
                    <div>
                      <FormLabel>Показывать профиль другим пользователям</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Если отключить, профиль будет доступен только вам и администраторам.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  "Сохранить"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
