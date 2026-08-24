import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { db } from "@/lib/db"
import * as z from "zod"

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, password } = registerSchema.parse(body)

    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 400 }
      )
    }

    const hashedPassword = await hash(password, 12)

    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role: "STUDENT",
      },
    })

    return NextResponse.json(
      { message: "Пользователь успешно создан", userId: user.userUid },
      { status: 201 }
    )
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Registration error:", error)
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные", details: error.issues }, { status: 400 })
    }

    // Проверяем специфичные ошибки Prisma
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: "Пользователь с таким email уже существует" },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { 
        error: "Произошла ошибка при регистрации",
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    )
  }
}
