import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { z } from "zod"

const updateProfileSchema = z.object({
  name: z.string().min(2, "Имя должно содержать минимум 2 символа").max(100).optional(),
  bio: z.string().max(500, "Биография не должна превышать 500 символов").optional().nullable(),
  avatarUrl: z.string().url("Неверный URL аватара").optional().nullable().or(z.literal("")),
  firstName: z.string().max(50).optional().nullable(),
  lastName: z.string().max(50).optional().nullable(),
  middleName: z.string().max(50).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  timezone: z.string().max(50).optional().nullable(),
  organization: z.string().max(120).optional().nullable(),
  position: z.string().max(120).optional().nullable(),
  subjects: z.string().max(200).optional().nullable(),
  gradeLevel: z.string().max(120).optional().nullable(),
  experienceYears: z
    .preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
      z.number().int().min(0).max(80).nullable()
    )
    .optional(),
  education: z.string().max(200).optional().nullable(),
  websiteUrl: z.string().url("Неверный URL сайта").optional().nullable().or(z.literal("")),
  telegram: z.string().max(64).optional().nullable(),
  vk: z.string().url("Неверный URL VK").optional().nullable().or(z.literal("")),
  linkedin: z.string().url("Неверный URL LinkedIn").optional().nullable().or(z.literal("")),
  isProfilePublic: z.boolean().optional(),
})

/**
 * GET /api/profile
 * Get current user's profile
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await requireAuth()
    const userUid = session.user.id

    const user = await db.user.findUnique({
      where: { userUid },
      select: {
        userUid: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        bio: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phone: true,
        city: true,
        country: true,
        timezone: true,
        organization: true,
        position: true,
        subjects: true,
        gradeLevel: true,
        experienceYears: true,
        education: true,
        websiteUrl: true,
        telegram: true,
        vk: true,
        linkedin: true,
        isProfilePublic: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json(
      { error: "Ошибка при получении профиля" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/profile
 * Update current user's profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userUid = session.user.id

    const body = await request.json()
    const data = updateProfileSchema.parse(body)

    // Проверяем существование пользователя
    const existingUser = await db.user.findUnique({
      where: { userUid },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      )
    }

    // Обновляем профиль
    const normalize = (value: string | null | undefined) =>
      value === "" ? null : value

    const updatedUser = await db.user.update({
      where: { userUid },
      data: {
        name: data.name !== undefined ? data.name : undefined,
        bio: data.bio !== undefined ? data.bio : undefined,
        avatarUrl: data.avatarUrl === "" ? null : data.avatarUrl !== undefined ? data.avatarUrl : undefined,
        firstName: data.firstName !== undefined ? normalize(data.firstName) : undefined,
        lastName: data.lastName !== undefined ? normalize(data.lastName) : undefined,
        middleName: data.middleName !== undefined ? normalize(data.middleName) : undefined,
        phone: data.phone !== undefined ? normalize(data.phone) : undefined,
        city: data.city !== undefined ? normalize(data.city) : undefined,
        country: data.country !== undefined ? normalize(data.country) : undefined,
        timezone: data.timezone !== undefined ? normalize(data.timezone) : undefined,
        organization: data.organization !== undefined ? normalize(data.organization) : undefined,
        position: data.position !== undefined ? normalize(data.position) : undefined,
        subjects: data.subjects !== undefined ? normalize(data.subjects) : undefined,
        gradeLevel: data.gradeLevel !== undefined ? normalize(data.gradeLevel) : undefined,
        experienceYears: data.experienceYears !== undefined ? data.experienceYears : undefined,
        education: data.education !== undefined ? normalize(data.education) : undefined,
        websiteUrl: data.websiteUrl === "" ? null : data.websiteUrl !== undefined ? data.websiteUrl : undefined,
        telegram: data.telegram !== undefined ? normalize(data.telegram) : undefined,
        vk: data.vk === "" ? null : data.vk !== undefined ? data.vk : undefined,
        linkedin: data.linkedin === "" ? null : data.linkedin !== undefined ? data.linkedin : undefined,
        isProfilePublic: data.isProfilePublic !== undefined ? data.isProfilePublic : undefined,
      },
      select: {
        userUid: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        bio: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phone: true,
        city: true,
        country: true,
        timezone: true,
        organization: true,
        position: true,
        subjects: true,
        gradeLevel: true,
        experienceYears: true,
        education: true,
        websiteUrl: true,
        telegram: true,
        vk: true,
        linkedin: true,
        isProfilePublic: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверные данные", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating profile:", error)
    return NextResponse.json(
      { error: "Ошибка при обновлении профиля" },
      { status: 500 }
    )
  }
}
