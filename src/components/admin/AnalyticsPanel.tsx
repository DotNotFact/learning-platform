"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AdminAnalytics } from "@/lib/admin-analytics"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ru } from "date-fns/locale/ru"

function formatPct(value: number) {
  return `${Math.round(value)}%`
}

export function AnalyticsPanel({ analytics }: { analytics: AdminAnalytics }) {
  const { summary, topCourses, recentEnrollments, recentQuizAttempts } = analytics

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Пользователи</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.usersCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Активные: {summary.activeUsersCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Курсы</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.coursesCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Опубликовано: {summary.publishedCoursesCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Записи / прогресс</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.enrollmentsCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Завершено: {summary.completedEnrollmentsCount} · Средний прогресс: {formatPct(summary.avgEnrollmentProgress)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Тесты</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.quizAttemptsCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Успешно: {summary.passedQuizAttemptsCount} · Средний балл: {formatPct(summary.avgQuizPercentage)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Топ курсов (по записям)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Курс</TableHead>
                  <TableHead className="w-[120px]">Записи</TableHead>
                  <TableHead className="w-[140px]">Завершения</TableHead>
                  <TableHead className="w-[140px]">Средн. прогресс</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCourses.map((c) => (
                  <TableRow key={c.courseUid}>
                    <TableCell>
                      <div className="font-medium">{c.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.authorName ? `Автор: ${c.authorName}` : "Автор: —"} ·{" "}
                        {c.isPublished ? <Badge>published</Badge> : <Badge variant="secondary">draft</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{c.enrollments}</TableCell>
                    <TableCell>{c.completions}</TableCell>
                    <TableCell>{formatPct(c.avgProgress)}</TableCell>
                  </TableRow>
                ))}
                {topCourses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      Пока нет данных.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Системные метрики</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Сертификаты</span>
              <span className="font-medium">{summary.certificatesCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Сдачи заданий</span>
              <span className="font-medium">{summary.submissionsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Непромодерированные комментарии</span>
              <span className="font-medium">{summary.unapprovedCommentsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Непрочитанные уведомления</span>
              <span className="font-medium">{summary.unreadNotificationsCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Последние записи</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Курс</TableHead>
                  <TableHead className="w-[140px]">Прогресс</TableHead>
                  <TableHead className="w-[170px]">Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEnrollments.map((e) => (
                  <TableRow key={e.enrollmentUid}>
                    <TableCell className="font-medium">{e.user.name || e.user.email}</TableCell>
                    <TableCell>{e.course.title}</TableCell>
                    <TableCell>{formatPct(e.progress)}</TableCell>
                    <TableCell>{format(e.enrolledAt, "dd MMM yyyy, HH:mm", { locale: ru })}</TableCell>
                  </TableRow>
                ))}
                {recentEnrollments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      Пока нет данных.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Последние попытки тестов</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Тест</TableHead>
                  <TableHead className="w-[120px]">Результат</TableHead>
                  <TableHead className="w-[170px]">Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentQuizAttempts.map((a) => (
                  <TableRow key={a.attemptUid}>
                    <TableCell className="font-medium">{a.user.name || a.user.email}</TableCell>
                    <TableCell>
                      <div className="font-medium">{a.quiz.title}</div>
                      <div className="text-xs text-muted-foreground">{a.quiz.course.title}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {a.passed ? <Badge>passed</Badge> : <Badge variant="secondary">failed</Badge>}
                        <span>{formatPct(a.percentage)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{format(a.completedAt, "dd MMM yyyy, HH:mm", { locale: ru })}</TableCell>
                  </TableRow>
                ))}
                {recentQuizAttempts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      Пока нет данных.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

