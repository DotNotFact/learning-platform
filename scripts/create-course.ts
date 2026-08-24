#!/usr/bin/env node
/**
 * Скрипт создания курса
 * Использование: 
 *   npm run create-course
 *   npm run create-course -- --title "Название" --description "Описание"
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

async function createCourse() {
  try {
    console.log("📚 Создание нового курса\n")

    // Находим администратора или преподавателя
    const admin = await db.user.findFirst({
      where: {
        role: {
          in: ["ADMIN", "TEACHER"],
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    if (!admin) {
      console.error("❌ Не найден администратор или преподаватель.")
      console.error("💡 Сначала создайте администратора: npm run create-admin")
      process.exit(1)
    }

    // Получаем аргументы командной строки
    const args = process.argv.slice(2)
    const titleArg = args.find((arg) => arg.startsWith("--title="))?.split("=")[1]
    const descArg = args.find((arg) => arg.startsWith("--description="))?.split("=")[1]
    const categoryArg = args.find((arg) => arg.startsWith("--category="))?.split("=")[1]
    const difficultyArg = args.find((arg) => arg.startsWith("--difficulty="))?.split("=")[1]
    const publishedArg = args.find((arg) => arg.startsWith("--published="))?.split("=")[1]

    // Получаем категории
    const categories = await db.category.findMany({
      orderBy: {
        orderIndex: "asc",
      },
    })

    // Название курса
    let title = titleArg
    if (!title) {
      title = await question("📝 Название курса: ")
      if (!title.trim()) {
        console.error("❌ Название курса обязательно!")
        rl.close()
        process.exit(1)
      }
    }

    // Описание
    let description: string | undefined = descArg
    if (!description) {
      const descInput = await question("📄 Описание (Enter для пропуска): ")
      description = descInput.trim() || undefined
    }

    // Категория
    let categoryUid: string | null = null
    if (categories.length > 0) {
      if (categoryArg) {
        const category = categories.find((c) => c.slug === categoryArg || c.name === categoryArg)
        if (category) {
          categoryUid = category.categoryUid
        } else {
          console.log(`⚠️  Категория "${categoryArg}" не найдена`)
        }
      }

      if (!categoryUid) {
        console.log("\n📁 Доступные категории:")
        categories.forEach((cat, index) => {
          console.log(`   ${index + 1}. ${cat.name} (${cat.slug})`)
        })
        const categoryChoice = await question(
          `\nВыберите категорию (номер или Enter для пропуска): `
        )
        if (categoryChoice.trim()) {
          const index = parseInt(categoryChoice) - 1
          if (index >= 0 && index < categories.length) {
            categoryUid = categories[index].categoryUid
          }
        }
      }
    }

    // Уровень сложности
    let difficulty: string | null = null
    if (difficultyArg) {
      if (["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(difficultyArg.toUpperCase())) {
        difficulty = difficultyArg.toUpperCase()
      }
    } else {
      const difficultyChoice = await question(
        "🎯 Уровень сложности (BEGINNER/INTERMEDIATE/ADVANCED, Enter для пропуска): "
      )
      if (difficultyChoice.trim()) {
        const upper = difficultyChoice.toUpperCase()
        if (["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(upper)) {
          difficulty = upper
        }
      }
    }

    // Оценочное время
    const hoursInput = await question("⏱️  Оценочное время в часах (Enter для пропуска): ")
    const estimatedHours = hoursInput.trim() ? parseInt(hoursInput) : null

    // Цена
    const priceInput = await question("💰 Цена (Enter для бесплатного курса): ")
    const price = priceInput.trim() ? parseFloat(priceInput) : 0

    // URL изображения
    const thumbnailInput = await question("🖼️  URL изображения (Enter для пропуска): ")
    const thumbnailUrl = thumbnailInput.trim() || null

    // Публикация
    let isPublished = false
    if (publishedArg) {
      isPublished = publishedArg.toLowerCase() === "true" || publishedArg === "1"
    } else {
      const publishedChoice = await question("📢 Опубликовать курс? (y/n, по умолчанию n): ")
      isPublished = publishedChoice.toLowerCase() === "y" || publishedChoice.toLowerCase() === "yes"
    }

    // Порядок сортировки
    const orderInput = await question("🔢 Порядок сортировки (по умолчанию 0): ")
    const orderIndex = orderInput.trim() ? parseInt(orderInput) : 0

    console.log("\n⏳ Создание курса...")

    const course = await db.course.create({
      data: {
        title: title.trim(),
        description,
        categoryUid,
        difficulty,
        estimatedHours,
        price,
        thumbnailUrl,
        isPublished,
        orderIndex,
        authorUid: admin.userUid,
      },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        category: true,
      },
    })

    console.log("\n" + "=".repeat(50))
    console.log("✅ Курс успешно создан!")
    console.log("=".repeat(50))
    console.log(`\n📚 Название: ${course.title}`)
    console.log(`📄 Описание: ${course.description || "не указано"}`)
    console.log(`👤 Автор: ${course.author.name || course.author.email}`)
    if (course.category) {
      console.log(`📁 Категория: ${course.category.name}`)
    }
    if (course.difficulty) {
      console.log(`🎯 Сложность: ${course.difficulty}`)
    }
    if (course.estimatedHours) {
      console.log(`⏱️  Время: ${course.estimatedHours} часов`)
    }
    console.log(`💰 Цена: ${course.price === 0 ? "Бесплатно" : `${course.price} руб.`}`)
    console.log(`📢 Статус: ${course.isPublished ? "Опубликован" : "Черновик"}`)
    console.log(`🆔 UID: ${course.courseUid}`)
    console.log("\n💡 Следующие шаги:")
    console.log("   - Добавьте уроки через админ-панель или API")
    console.log("   - Добавьте тесты через админ-панель или API")
    console.log("   - Используйте Prisma Studio для управления: npm run db:studio")
    console.log("")
  } catch (error) {
    console.error("❌ Ошибка при создании курса:", error)
    process.exit(1)
  } finally {
    rl.close()
    await db.$disconnect()
  }
}

createCourse()
