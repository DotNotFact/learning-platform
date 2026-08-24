
export type NotificationType =
  | "COURSE_PUBLISHED"
  | "QUIZ_GRADED"
  | "COMMENT_REPLY"
  | "ASSIGNMENT_GRADED"
  | "CERTIFICATE_ISSUED"
  | "COURSE_ENROLLED"
  | "SYSTEM"

export interface Notification {
  notificationUid: string
  userUid: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: Date
}
