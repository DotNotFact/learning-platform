#!/usr/bin/env node
/**
 * Скрипт сброса базы данных (ОСТОРОЖНО: удаляет все данные!)
 * Использование: npm run reset-db
 * 
 * ВНИМАНИЕ: Этот скрипт удаляет все данные из базы данных!
 * Используйте только для разработки.
 */

import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import readline from "readline"

process.stdout.setDefaultEncoding("utf-8")

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./prisma/dev.db" })
const db = new PrismaClient({ adapter })

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

async function resetDatabase() {
  try {
    console.log("⚠️  ВНИМАНИЕ: Этот скрипт удалит ВСЕ данные из базы данных!")
    console.log("   Это действие нельзя отменить!\n")

    const answer = await question("Вы уверены? Введите 'yes' для подтверждения: ")

    if (answer.toLowerCase() !== "yes") {
      console.log("❌ Операция отменена")
      rl.close()
      return
    }

    console.log("\n🗑️  Удаление данных...")

    // Удаляем в правильном порядке (с учетом foreign keys)
    await db.assignmentSubmission.deleteMany()
    await db.assignment.deleteMany()
    await db.progress.deleteMany()
    await db.quizAttempt.deleteMany()
    await db.question.deleteMany()
    await db.quiz.deleteMany()
    await db.lesson.deleteMany()
    await db.certificate.deleteMany()
    await db.enrollment.deleteMany()
    await db.comment.deleteMany()
    await db.notification.deleteMany()
    await db.courseTag.deleteMany()
    await db.tag.deleteMany()
    await db.course.deleteMany()
    await db.category.deleteMany()
    await db.user.deleteMany()

    console.log("✅ База данных очищена")
    console.log("\n💡 Теперь вы можете:")
    console.log("   - Создать администратора: npm run create-admin")
    console.log("   - Создать тестовых пользователей: npm run create-test-users")
    console.log("   - Создать тестовые курсы: npm run create-courses")
    console.log("")
  } catch (error) {
    console.error("❌ Ошибка при сбросе базы данных:", error)
    process.exit(1)
  } finally {
    rl.close()
    await db.$disconnect()
  }
}

resetDatabase()
