"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CoursesTable } from "./CoursesTable"
import { UsersTable } from "./UsersTable"
import { CategoriesTable } from "./CategoriesTable"
import { CommentsModerationTable, type AdminComment } from "./CommentsModerationTable"
import { NotificationsAdminPanel, type AdminNotification } from "./NotificationsAdminPanel"
import { AnalyticsPanel } from "./AnalyticsPanel"
import { TagsTable } from "./TagsTable"
import { CreateCourseDialog } from "./CreateCourseDialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { CategoryWithCount, CourseDetails, CourseListItem, TagWithCount, UserBasic } from "@/types"
import type { AdminAnalytics } from "@/lib/admin-analytics"

interface AdminPanelProps {
  initialCourses: CourseDetails[]
  initialUsers: UserBasic[]
  initialCategories: CategoryWithCount[]
  initialTags: TagWithCount[]
  initialComments: AdminComment[]
  initialNotifications: AdminNotification[]
  initialAnalytics: AdminAnalytics
}

export function AdminPanel({
  initialCourses,
  initialUsers,
  initialCategories,
  initialTags,
  initialComments,
  initialNotifications,
  initialAnalytics,
}: AdminPanelProps) {
  const [courses, setCourses] = useState(initialCourses)
  const [users] = useState(initialUsers)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const handleCourseCreated = (newCourse: CourseListItem) => {
    // Преобразуем CourseListItem в CourseDetails для добавления в список
    const courseDetails: CourseDetails = {
      ...newCourse,
      lessons: [],
      videos: [],
      quizzes: [],
    }
    setCourses([courseDetails, ...courses])
  }

  const handleCourseUpdated = (updatedCourse: CourseDetails) => {
    setCourses(courses.map((c) => (c.courseUid === updatedCourse.courseUid ? updatedCourse : c)))
  }

  const handleCourseDeleted = (courseUid: string) => {
    setCourses(courses.filter((c) => c.courseUid !== courseUid))
  }

  const totalCourses = courses.length
  const publishedCourses = courses.filter((c) => c.isPublished).length
  const draftCourses = courses.filter((c) => !c.isPublished).length
  const totalUsers = users.length

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Админ-панель</h1>
            <p className="text-muted-foreground text-lg">
              Управление курсами, пользователями и контентом платформы
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Создать курс
          </Button>
        </div>

        {/* Статистика */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <div className="rounded-lg border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Всего курсов</p>
                <p className="text-2xl font-bold mt-1">{totalCourses}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-lg">📚</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Опубликовано</p>
                <p className="text-2xl font-bold mt-1 text-green-600">{publishedCourses}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 text-lg">✓</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Черновики</p>
                <p className="text-2xl font-bold mt-1 text-yellow-600">{draftCourses}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <span className="text-yellow-600 text-lg">📝</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Пользователей</p>
                <p className="text-2xl font-bold mt-1">{totalUsers}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 text-lg">👥</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="courses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
          <TabsTrigger value="courses">Курсы</TabsTrigger>
          <TabsTrigger value="users">Пользователи</TabsTrigger>
          <TabsTrigger value="categories">Категории</TabsTrigger>
          <TabsTrigger value="tags">Теги</TabsTrigger>
          <TabsTrigger value="comments">Комментарии</TabsTrigger>
          <TabsTrigger value="notifications">Уведомления</TabsTrigger>
        </TabsList>
        <TabsContent value="analytics">
          <AnalyticsPanel analytics={initialAnalytics} />
        </TabsContent>
        <TabsContent value="courses">
          <CoursesTable
            courses={courses}
            onUpdate={handleCourseUpdated}
            onDelete={handleCourseDeleted}
          />
        </TabsContent>
        <TabsContent value="users">
          <UsersTable users={users} />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTable initialCategories={initialCategories} />
        </TabsContent>
        <TabsContent value="tags">
          <TagsTable initialTags={initialTags} />
        </TabsContent>
        <TabsContent value="comments">
          <CommentsModerationTable initialComments={initialComments} />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsAdminPanel
            initialNotifications={initialNotifications}
            users={users.map((u) => ({ userUid: u.userUid, name: u.name, email: u.email }))}
          />
        </TabsContent>
      </Tabs>

      <CreateCourseDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCourseCreated={handleCourseCreated}
      />
    </div>
  )
}
