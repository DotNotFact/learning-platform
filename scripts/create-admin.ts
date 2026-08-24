#!/usr/bin/env node
/**
 * Скрипт создания администратора
 * Использование: npm run create-admin
 * 
 * Переменные окружения:
 * - ADMIN_EMAIL (по умолчанию: admin@example.com)
 * - ADMIN_PASSWORD (по умолчанию: admin123)
 * - ADMIN_NAME (по умолчанию: Администратор)
 */

import { hash } from "bcryptjs"
import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"

// Устанавливаем кодировку UTF-8 для правильного отображения
process.stdout.setDefaultEncoding("utf-8")

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./prisma/dev.db" })
const db = new PrismaClient({ adapter })

async function createAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL || "admin@example.com"
    const password = process.env.ADMIN_PASSWORD || "admin123"
    const name = process.env.ADMIN_NAME || "Администратор"

    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      console.log("⚠️  Администратор с таким email уже существует")
      console.log(`   Email: ${existingUser.email}`)
      console.log(`   UID: ${existingUser.userUid}`)
      console.log(`   Роль: ${existingUser.role}`)
      return
    }

    const hashedPassword = await hash(password, 12)

    const admin = await db.user.create({
      data: {
        email,
        name,
        passwordHash: hashedPassword,
        role: "ADMIN",
        isActive: true,
      },
    })

    console.log("\n✅ Администратор успешно создан:")
    console.log(`📧 Email: ${admin.email}`)
    console.log(`🔑 Пароль: ${password}`)
    console.log(`👤 Имя: ${admin.name}`)
    console.log(`🆔 UID: ${admin.userUid}`)
    console.log(`🔐 Роль: ${admin.role}`)
    console.log("\n⚠️  ВАЖНО: Сохраните эти данные для входа в систему!\n")
  } catch (error) {
    console.error("❌ Ошибка при создании администратора:", error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

createAdmin()
