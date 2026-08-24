import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Trophy } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

const roleLabels: Record<string, string> = {
  STUDENT: "Студент",
  TEACHER: "Преподаватель",
  MODERATOR: "Модератор",
  MANAGER: "Менеджер",
  ADMIN: "Администратор",
}

export default async function LeaderboardPage() {
  await requireAuth()

  const users = await db.user.findMany({
    where: { isActive: true },
    select: {
      userUid: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
    },
  })

  const [completedLessonsByUser, completedCoursesByUser, quizAttempts] = await Promise.all([
    db.progress.groupBy({
      by: ["userUid"],
      where: { completed: true },
      _count: { _all: true },
    }),
    db.enrollment.groupBy({
      by: ["userUid"],
      where: { OR: [{ progress: { gte: 100 } }, { completedAt: { not: null } }] },
      _count: { _all: true },
    }),
    db.quizAttempt.findMany({
      select: {
        userUid: true,
        quizUid: true,
        percentage: true,
        passed: true,
        quiz: {
          select: {
            passingScore: true,
          },
        },
      },
    }),
  ])

  const lessonsMap = new Map(completedLessonsByUser.map((row) => [row.userUid, row._count._all]))
  const coursesMap = new Map(completedCoursesByUser.map((row) => [row.userUid, row._count._all]))

  const passedQuizMap = new Map<string, Set<string>>()
  quizAttempts.forEach((attempt) => {
    const passingScore = attempt.quiz?.passingScore ?? 70
    if (!(attempt.passed || attempt.percentage >= passingScore)) return
    const existing = passedQuizMap.get(attempt.userUid) ?? new Set<string>()
    existing.add(attempt.quizUid)
    passedQuizMap.set(attempt.userUid, existing)
  })

  const leaderboard = users
    .map((user) => {
      const completedLessons = lessonsMap.get(user.userUid) ?? 0
      const completedCourses = coursesMap.get(user.userUid) ?? 0
      const passedQuizzes = passedQuizMap.get(user.userUid)?.size ?? 0
      const points = completedLessons + passedQuizzes * 3 + completedCourses * 5

      return {
        userUid: user.userUid,
        name: user.name || user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        completedLessons,
        completedCourses,
        passedQuizzes,
        points,
      }
    })
    .sort((a, b) => b.points - a.points)
    .slice(0, 20)

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Trophy className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Таблица лидеров</h1>
          <p className="text-muted-foreground">Лучшие результаты по завершенным курсам и тестам</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Участник</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Курсы</TableHead>
              <TableHead>Уроки</TableHead>
              <TableHead>Тесты</TableHead>
              <TableHead>Очки</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard.map((row, index) => (
              <TableRow key={row.userUid}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>
                  <Link href={`/users/${row.userUid}`} className="flex items-center gap-3 hover:text-primary">
                    {row.avatarUrl ? (
                      <Image
                        src={row.avatarUrl}
                        alt={row.name}
                        width={36}
                        height={36}
                        className="h-9 w-9 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                        {row.name?.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium">{row.name}</span>
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{roleLabels[row.role] || row.role}</Badge>
                </TableCell>
                <TableCell>{row.completedCourses}</TableCell>
                <TableCell>{row.completedLessons}</TableCell>
                <TableCell>{row.passedQuizzes}</TableCell>
                <TableCell className="font-semibold">{row.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
