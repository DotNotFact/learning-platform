import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * GET /api/certificates
 * Get user's certificates
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await requireAuth()
    const userUid = session.user.id

    const certificates = await db.certificate.findMany({
      where: { userUid },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        issuedAt: "desc",
      },
    })

    // Получаем информацию о курсах
    const certificatesWithCourses = await Promise.all(
      certificates.map(async (certificate) => {
        const course = await db.course.findUnique({
          where: { courseUid: certificate.courseUid },
          select: {
            courseUid: true,
            title: true,
            thumbnailUrl: true,
            description: true,
            author: {
              select: {
                name: true,
              },
            },
          },
        })

        return {
          certificateUid: certificate.certificateUid,
          userUid: certificate.userUid,
          courseUid: certificate.courseUid,
          issuedAt: certificate.issuedAt,
          certificateUrl: certificate.certificateUrl,
          course: course
            ? {
                courseUid: course.courseUid,
                title: course.title,
                thumbnailUrl: course.thumbnailUrl,
                description: course.description,
                authorName: course.author.name,
              }
            : null,
        }
      })
    )

    return NextResponse.json({ certificates: certificatesWithCourses })
  } catch (error) {
    console.error("Error fetching certificates:", error)
    return NextResponse.json(
      { error: "Ошибка при получении сертификатов" },
      { status: 500 }
    )
  }
}
