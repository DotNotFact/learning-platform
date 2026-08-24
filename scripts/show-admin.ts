#!/usr/bin/env node
/**
 * Скрипт отображения всех администраторов
 * Использование: npm run show-admin
 */

import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"

process.stdout.setDefaultEncoding("utf-8")

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./prisma/dev.db" })
const db = new PrismaClient({ adapter })

async function showAdmin() {
  try {
    const admins = await db.user.findMany({
      where: { role: "ADMIN" },
      select: {
        userUid: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    if (admins.length === 0) {
      console.log("⚠️  Администраторы не найдены в базе данных")
      console.log("💡 Используйте: npm run create-admin")
      return
    }

    console.log(`\n📊 Найдено администраторов: ${admins.length}\n`)
    admins.forEach((admin: { email: any; name: any; userUid: any; role: any; isActive: any; createdAt: { toLocaleString: (arg0: string) => any } }, index: number) => {
      console.log(`${index + 1}. Администратор:`)
      console.log(`   📧 Email: ${admin.email}`)
      console.log(`   👤 Имя: ${admin.name || "не указано"}`)
      console.log(`   🆔 UID: ${admin.userUid}`)
      console.log(`   🔐 Роль: ${admin.role}`)
      console.log(`   ✅ Активен: ${admin.isActive ? "Да" : "Нет"}`)
      console.log(`   📅 Создан: ${admin.createdAt.toLocaleString("ru-RU")}`)
      console.log("")
    })
  } catch (error) {
    console.error("❌ Ошибка при получении администраторов:", error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

showAdmin()
