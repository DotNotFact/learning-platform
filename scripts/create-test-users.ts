#!/usr/bin/env node
/**
 * Скрипт создания тестовых пользователей разных ролей
 * Использование: npm run create-test-users
 */

import { hash } from "bcryptjs"
import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"

process.stdout.setDefaultEncoding("utf-8")

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./prisma/dev.db" })
const db = new PrismaClient({ adapter })

async function createTestUsers() {
  try {
    console.log("👥 Создание тестовых пользователей...\n")

    const users = [
      {
        email: "teacher@example.com",
        password: "teacher123",
        name: "Преподаватель Тестовый",
        role: "TEACHER" as const,
      },
      {
        email: "moderator@example.com",
        password: "moderator123",
        name: "Модератор Тестовый",
        role: "MODERATOR" as const,
      },
      {
        email: "manager@example.com",
        password: "manager123",
        name: "Менеджер Тестовый",
        role: "MANAGER" as const,
      },
      {
        email: "student@example.com",
        password: "student123",
        name: "Студент Тестовый",
        role: "STUDENT" as const,
      },
    ]

    const createdUsers: Array<{
      email: string
      password: string
      name: string
      role: "TEACHER" | "MODERATOR" | "MANAGER" | "STUDENT"
      userUid: string
    }> = []

    for (const userData of users) {
      const existingUser = await db.user.findUnique({
        where: { email: userData.email },
      })

      if (existingUser) {
        console.log(`⚠️  Пользователь ${userData.email} уже существует`)
        continue
      }

      const hashedPassword = await hash(userData.password, 12)

      const user = await db.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          passwordHash: hashedPassword,
          role: userData.role,
          isActive: true,
        },
      })

      createdUsers.push({ ...userData, userUid: user.userUid })
      console.log(`✅ Создан ${userData.role}: ${userData.email}`)
    }

    if (createdUsers.length > 0) {
      console.log("\n" + "=".repeat(50))
      console.log("✅ Пользователи успешно созданы!")
      console.log("=".repeat(50))
      console.log("\n📋 Учетные данные:")
      createdUsers.forEach((user) => {
        console.log(`\n   👤 ${user.name}`)
        console.log(`      📧 Email: ${user.email}`)
        console.log(`      🔑 Пароль: ${user.password}`)
        console.log(`      🔐 Роль: ${user.role}`)
        console.log(`      🆔 UID: ${user.userUid}`)
      })
      console.log("")
    } else {
      console.log("\n⚠️  Все пользователи уже существуют")
    }
  } catch (error) {
    console.error("❌ Ошибка при создании пользователей:", error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

createTestUsers()
