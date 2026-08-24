import { db } from "@/lib/db"
import { notifyCertificateIssued } from "./notifications"
import { getCourseProgressSummary } from "./course-progress"

/**
 * Check if course is completed (100% progress) and issue certificate if needed
 */
export async function checkAndIssueCertificate(
  userUid: string,
  courseUid: string
): Promise<boolean> {
  try {
    // Проверяем, есть ли уже сертификат
    const existingCertificate = await db.certificate.findUnique({
      where: {
        userUid_courseUid: {
          userUid,
          courseUid,
        },
      },
    })

    if (existingCertificate) {
      return false // Сертификат уже выдан
    }

    // Получаем запись на курс
    const enrollment = await db.enrollment.findUnique({
      where: {
        userUid_courseUid: {
          userUid,
          courseUid,
        },
      },
    })

    if (!enrollment) {
      return false // Пользователь не записан на курс
    }

    const summary = await getCourseProgressSummary(userUid, courseUid)

    // Если прогресс 100%, выдаем сертификат
    if (summary.isCompleted) {
      // Обновляем enrollment с completedAt, если еще не обновлен
      if (!enrollment.completedAt || enrollment.progress < 100) {
        await db.enrollment.update({
          where: {
            userUid_courseUid: {
              userUid,
              courseUid,
            },
          },
          data: {
            completedAt: enrollment.completedAt ?? new Date(),
            progress: summary.progressPercentage,
          },
        })
      }

      // Создаем сертификат
      await db.certificate.create({
        data: {
          userUid,
          courseUid,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })

      // Получаем информацию о курсе для уведомления
      const course = await db.course.findUnique({
        where: { courseUid },
        select: {
          title: true,
        },
      })

      if (course) {
        // Отправляем уведомление о выдаче сертификата
        await notifyCertificateIssued(userUid, course.title, courseUid)
      }

      return true
    }

    return false
  } catch (error) {
    console.error("Error checking and issuing certificate:", error)
    return false
  }
}
