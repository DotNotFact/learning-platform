import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { User, Mail, Phone, MapPin, Calendar, Globe } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import Image from "next/image"

const roleLabels: Record<string, string> = {
  STUDENT: "Студент",
  TEACHER: "Преподаватель",
  MODERATOR: "Модератор",
  MANAGER: "Менеджер",
  ADMIN: "Администратор",
}

const roleColors: Record<string, string> = {
  STUDENT: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  TEACHER: "bg-green-100 text-green-800 hover:bg-green-100",
  MODERATOR: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  MANAGER: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  ADMIN: "bg-red-100 text-red-800 hover:bg-red-100",
}

interface PageProps {
  params: Promise<{ userUid: string }> | { userUid: string }
}

export default async function UserProfilePage({ params }: PageProps) {
  const session = await requireAuth()
  const resolvedParams = await Promise.resolve(params)
  const viewerUid = session.user.id

  if (resolvedParams.userUid === viewerUid) {
    redirect("/profile")
  }

  const user = await db.user.findUnique({
    where: { userUid: resolvedParams.userUid },
    select: {
      userUid: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      bio: true,
      firstName: true,
      lastName: true,
      middleName: true,
      phone: true,
      city: true,
      country: true,
      timezone: true,
      organization: true,
      position: true,
      subjects: true,
      gradeLevel: true,
      experienceYears: true,
      education: true,
      websiteUrl: true,
      telegram: true,
      vk: true,
      linkedin: true,
      isProfilePublic: true,
      isActive: true,
      createdAt: true,
    },
  })

  if (!user) {
    notFound()
  }

  const isAdmin = session.user.role === "ADMIN"
  if (!user.isProfilePublic && !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Профиль скрыт пользователем</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Этот пользователь закрыл доступ к своему профилю. Администратор может видеть профиль,
              остальные пользователи - нет.
            </p>
            <Link href="/leaderboard">
              <Button variant="outline">Вернуться к лидерам</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const fullName = [user.lastName, user.firstName, user.middleName].filter(Boolean).join(" ")
  const displayName = user.name || fullName || user.email
  const location = [user.city, user.country].filter(Boolean).join(", ")

  const normalizeLink = (value: string | null | undefined) => {
    if (!value) return null
    if (value.startsWith("http://") || value.startsWith("https://")) return value
    return `https://${value}`
  }

  const profileFields = [
    { label: "ФИО", value: fullName },
    { label: "Организация", value: user.organization },
    { label: "Должность", value: user.position },
    { label: "Предметы / специализация", value: user.subjects },
    { label: "Уровень/класс", value: user.gradeLevel },
    {
      label: "Опыт",
      value: user.experienceYears !== null && user.experienceYears !== undefined
        ? `${user.experienceYears} лет`
        : null,
    },
    { label: "Образование", value: user.education },
  ].filter((item) => item.value)

  const contactFields = [
    { label: "Телефон", value: user.phone },
    { label: "Город", value: location },
    { label: "Часовой пояс", value: user.timezone },
  ].filter((item) => item.value)

  const linkFields = [
    { label: "Сайт", value: normalizeLink(user.websiteUrl) },
    {
      label: "Telegram",
      value: user.telegram
        ? `https://t.me/${user.telegram.replace(/^@/, "")}`
        : null,
      display: user.telegram,
    },
    { label: "VK", value: normalizeLink(user.vk) },
    { label: "LinkedIn", value: normalizeLink(user.linkedin) },
  ].filter((item) => item.value)

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <div className="mb-6">
        <Link href="/leaderboard" className="text-sm text-muted-foreground hover:text-primary">
          ← Назад к таблице лидеров
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-2 lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-4">
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={displayName}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-full object-cover border-2"
                  unoptimized
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-12 w-12 text-primary" />
                </div>
              )}
              <div className="min-w-0">
                <CardTitle className="text-2xl wrap-break-word">{displayName}</CardTitle>
                <Badge className={`${roleColors[user.role] || "bg-gray-100 text-gray-800"} mt-2`}>
                  {roleLabels[user.role] || user.role}
                </Badge>
                {user.isActive === false && (
                  <Badge variant="destructive" className="mt-2">Неактивен</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <span className="break-all">{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <span>{user.phone}</span>
              </div>
            )}
            {location && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <span>{location}</span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <span>
                В системе с {format(new Date(user.createdAt), "d MMMM yyyy", { locale: ru })}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {user.bio && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle>О пользователе</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{user.bio}</p>
              </CardContent>
            </Card>
          )}

          {profileFields.length > 0 && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Профиль</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {profileFields.map((field) => (
                    <div key={field.label} className="space-y-1">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">{field.label}</div>
                      <div className="text-sm font-medium">{field.value}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(contactFields.length > 0 || linkFields.length > 0) && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Контакты и ссылки</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contactFields.length > 0 && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {contactFields.map((field) => (
                      <div key={field.label} className="space-y-1">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">{field.label}</div>
                        <div className="text-sm font-medium">{field.value}</div>
                      </div>
                    ))}
                  </div>
                )}
                {linkFields.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {linkFields.map((field) => (
                      <div key={field.label} className="space-y-1">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">{field.label}</div>
                        <a
                          href={field.value as string}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-primary hover:underline break-all"
                        >
                          {field.display || field.value}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {linkFields.length === 0 && contactFields.length === 0 && (
            <Card className="border-2">
              <CardContent className="py-10 text-center text-muted-foreground">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Globe className="h-4 w-4" />
                  <span>Пользователь пока не добавил ссылки</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
