#!/usr/bin/env node
/**
 * Скрипт проверки кодировки данных в базе данных
 * Использование: npm run check-encoding
 */

import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"

process.stdout.setDefaultEncoding("utf-8")

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./prisma/dev.db" })
const db = new PrismaClient({ adapter })

async function checkEncoding() {
  try {
    console.log("🔍 Проверка кодировки данных в базе данных...\n")

    // Проверяем пользователей
    const users = await db.user.findMany({
      take: 5,
      select: {
        email: true,
        name: true,
        role: true,
      },
    })

    if (users.length > 0) {
      console.log("👥 Пользователи:")
      users.forEach((user: { name: any; email: any; role: any }, index: number) => {
        console.log(`   ${index + 1}. ${user.name || "Без имени"} (${user.email}) - ${user.role}`)
      })
      console.log("")
    } else {
      console.log("⚠️  Пользователи не найдены\n")
    }

    // Проверяем курсы
    const courses = await db.course.findMany({
      take: 5,
      select: {
        title: true,
        description: true,
      },
    })

    if (courses.length > 0) {
      console.log("📚 Курсы:")
      courses.forEach((course: { title: any; description: string }, index: number) => {
        console.log(`   ${index + 1}. ${course.title}`)
        if (course.description) {
          const desc = course.description.substring(0, 50)
          console.log(`      ${desc}${course.description.length > 50 ? "..." : ""}`)
        }
      })
      console.log("")
    } else {
      console.log("⚠️  Курсы не найдены\n")
    }

    // Проверяем категории
    const categories = await db.category.findMany({
      take: 5,
      select: {
        name: true,
        description: true,
      },
    })

    if (categories.length > 0) {
      console.log("📁 Категории:")
      categories.forEach((category: { name: any; description: any }, index: number) => {
        console.log(`   ${index + 1}. ${category.name}`)
        if (category.description) {
          console.log(`      ${category.description}`)
        }
      })
      console.log("")
    } else {
      console.log("⚠️  Категории не найдены\n")
    }

    // Проверяем уроки
    const lessons = await db.lesson.findMany({
      take: 5,
      select: {
        title: true,
        description: true,
      },
    })

    if (lessons.length > 0) {
      console.log("📝 Уроки:")
      lessons.forEach((lesson: { title: any; description: string }, index: number) => {
        console.log(`   ${index + 1}. ${lesson.title}`)
        if (lesson.description) {
          const desc = lesson.description.substring(0, 50)
          console.log(`      ${desc}${lesson.description.length > 50 ? "..." : ""}`)
        }
      })
      console.log("")
    } else {
      console.log("⚠️  Уроки не найдены\n")
    }

    console.log("=".repeat(50))
    console.log("✅ Проверка завершена")
    console.log("=".repeat(50))
    console.log("\n💡 Если вы видите правильный русский текст выше,")
    console.log("   значит кодировка работает корректно!")
    console.log("\n⚠️  Если текст отображается неправильно:")
    console.log("   1. Убедитесь, что терминал поддерживает UTF-8")
    console.log("   2. Используйте Prisma Studio: npm run db:studio")
    console.log("   3. Проверьте настройки вашего SQLite клиента")
    console.log("")
  } catch (error) {
    console.error("❌ Ошибка при проверке кодировки:", error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

checkEncoding()
