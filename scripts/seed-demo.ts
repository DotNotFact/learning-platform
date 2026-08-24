#!/usr/bin/env node
import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./prisma/dev.db" })
const db = new PrismaClient({ adapter })

async function main() {
  const teacher = await db.user.findUniqueOrThrow({ where: { email: "teacher@example.com" } })
  const student = await db.user.findUniqueOrThrow({ where: { email: "student@example.com" } })

  const category = await db.category.upsert({
    where: { slug: "backend" },
    update: {},
    create: { name: "Backend-разработка", slug: "backend", description: "Серверная разработка, API, базы данных" },
  })

  const course = await db.course.upsert({
    where: { courseUid: "demo-course-1" },
    update: {},
    create: {
      courseUid: "demo-course-1",
      title: "ASP.NET Core: от нуля до продакшена",
      description: "Практический курс по разработке REST API на ASP.NET Core: архитектура, EF Core, аутентификация, деплой.",
      categoryUid: category.categoryUid,
      isPublished: true,
      difficulty: "INTERMEDIATE",
      estimatedHours: 12,
      price: 0,
      authorUid: teacher.userUid,
    },
  })

  const lesson1 = await db.lesson.upsert({
    where: { lessonUid: "demo-lesson-1" },
    update: {},
    create: {
      lessonUid: "demo-lesson-1",
      title: "Введение в ASP.NET Core",
      description: "Настройка проекта, middleware pipeline, DI-контейнер",
      content: "# Введение\n\nВ этом уроке разбираем структуру минимального API-проекта.",
      duration: 720,
      orderIndex: 0,
      isFree: true,
      courseUid: course.courseUid,
    },
  })

  await db.lesson.upsert({
    where: { lessonUid: "demo-lesson-2" },
    update: {},
    create: {
      lessonUid: "demo-lesson-2",
      title: "Работа с EF Core",
      description: "Миграции, отношения между сущностями, оптимизация запросов",
      content: "# EF Core\n\nDbContext, миграции и типичные ошибки N+1.",
      duration: 900,
      orderIndex: 1,
      isFree: false,
      courseUid: course.courseUid,
    },
  })

  const quiz = await db.quiz.upsert({
    where: { quizUid: "demo-quiz-1" },
    update: {},
    create: {
      quizUid: "demo-quiz-1",
      title: "Проверка знаний: основы ASP.NET Core",
      description: "5 вопросов по итогам первого модуля",
      passingScore: 70,
      courseUid: course.courseUid,
    },
  })

  await db.question.upsert({
    where: { questionUid: "demo-question-1" },
    update: {},
    create: {
      questionUid: "demo-question-1",
      text: "Какой метод регистрирует сервис как Singleton в DI-контейнере?",
      type: "SINGLE_CHOICE",
      options: JSON.stringify([
        { optionUid: "a", text: "AddScoped" },
        { optionUid: "b", text: "AddSingleton" },
        { optionUid: "c", text: "AddTransient" },
      ]),
      correctOptions: JSON.stringify(["b"]),
      points: 1,
      quizUid: quiz.quizUid,
      orderIndex: 0,
    },
  })

  await db.enrollment.upsert({
    where: { userUid_courseUid: { userUid: student.userUid, courseUid: course.courseUid } },
    update: {},
    create: {
      userUid: student.userUid,
      courseUid: course.courseUid,
      progress: 50,
    },
  })

  await db.progress.upsert({
    where: { userUid_lessonUid: { userUid: student.userUid, lessonUid: lesson1.lessonUid } },
    update: { completed: true },
    create: {
      userUid: student.userUid,
      lessonUid: lesson1.lessonUid,
      completed: true,
      completedAt: new Date(),
    },
  })

  console.log("Demo data seeded: category, course, 2 lessons, quiz+question, enrollment, progress")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
