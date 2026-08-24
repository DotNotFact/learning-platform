import { db } from "@/lib/db"
import type { NotificationType } from "@/types/notification"

/**
 * Create a notification for a user
 */
export async function createNotification(
  userUid: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string | null
) {
  try {
    const notification = await db.notification.create({
      data: {
        userUid,
        type,
        title,
        message,
        link: link || null,
      },
    })

    return notification
  } catch (error) {
    console.error("Error creating notification:", error)
    throw error
  }
}

/**
 * Create notification for course author when course is published
 */
export async function notifyCoursePublished(
  courseUid: string,
  courseTitle: string
) {
  try {
    const course = await db.course.findUnique({
      where: { courseUid },
      include: {
        author: {
          select: {
            userUid: true,
          },
        },
      },
    })

    if (!course) {
      throw new Error("Course not found")
    }

    await createNotification(
      course.author.userUid,
      "COURSE_PUBLISHED",
      "Ваш курс опубликован",
      `Курс "${courseTitle}" был успешно опубликован и теперь доступен для студентов.`,
      `/courses/${courseUid}`
    )
  } catch (error) {
    console.error("Error notifying course published:", error)
  }
}

/**
 * Create notification when someone replies to a comment
 */
export async function notifyCommentReply(
  parentCommentUid: string,
  replyContent: string,
  courseUid: string,
  courseTitle: string
) {
  try {
    const parentComment = await db.comment.findUnique({
      where: { commentUid: parentCommentUid },
      include: {
        user: {
          select: {
            userUid: true,
          },
        },
      },
    })

    if (!parentComment) {
      return
    }

    // Не отправляем уведомление, если пользователь отвечает на свой же комментарий
    const replyComment = await db.comment.findFirst({
      where: {
        parentUid: parentCommentUid,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            userUid: true,
          },
        },
      },
    })

    if (replyComment && replyComment.user.userUid === parentComment.user.userUid) {
      return
    }

    await createNotification(
      parentComment.user.userUid,
      "COMMENT_REPLY",
      "Новый ответ на ваш комментарий",
      `Кто-то ответил на ваш комментарий в курсе "${courseTitle}".`,
      `/courses/${courseUid}`
    )
  } catch (error) {
    console.error("Error notifying comment reply:", error)
  }
}

/**
 * Create notification when quiz is graded (for future use)
 */
export async function notifyQuizGraded(
  userUid: string,
  quizTitle: string,
  passed: boolean,
  courseUid: string
) {
  try {
    await createNotification(
      userUid,
      "QUIZ_GRADED",
      passed ? "Тест пройден успешно" : "Тест не пройден",
      `Результаты теста "${quizTitle}": ${passed ? "Поздравляем! Вы прошли тест." : "Попробуйте еще раз."}`,
      `/courses/${courseUid}`
    )
  } catch (error) {
    console.error("Error notifying quiz graded:", error)
  }
}

/**
 * Create notification when certificate is issued
 */
export async function notifyCertificateIssued(
  userUid: string,
  courseTitle: string,
  courseUid: string
) {
  try {
    await createNotification(
      userUid,
      "CERTIFICATE_ISSUED",
      "Сертификат выдан",
      `Поздравляем! Вы получили сертификат за прохождение курса "${courseTitle}".`,
      `/courses/${courseUid}`
    )
  } catch (error) {
    console.error("Error notifying certificate issued:", error)
  }
}

/**
 * Create notification when assignment is graded
 */
export async function notifyAssignmentGraded(
  userUid: string,
  assignmentTitle: string,
  courseUid: string,
  score: number | null,
  maxScore: number
) {
  try {
    const scoreText =
      score === null ? "оценка выставлена" : `оценка: ${score} / ${maxScore}`

    await createNotification(
      userUid,
      "ASSIGNMENT_GRADED",
      "Задание проверено",
      `Ваше задание "${assignmentTitle}" проверено (${scoreText}).`,
      `/courses/${courseUid}`
    )
  } catch (error) {
    console.error("Error notifying assignment graded:", error)
  }
}
