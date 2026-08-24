
export type UserRole = "STUDENT" | "TEACHER" | "MODERATOR" | "MANAGER" | "ADMIN"

export interface User {
  userUid: string
  email: string
  name: string | null
  role: UserRole
  avatarUrl?: string | null
  bio?: string | null
  firstName?: string | null
  lastName?: string | null
  middleName?: string | null
  phone?: string | null
  city?: string | null
  country?: string | null
  timezone?: string | null
  organization?: string | null
  position?: string | null
  subjects?: string | null
  gradeLevel?: string | null
  experienceYears?: number | null
  education?: string | null
  websiteUrl?: string | null
  telegram?: string | null
  vk?: string | null
  linkedin?: string | null
  isProfilePublic?: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UserBasic {
  userUid: string
  email: string
  name: string | null
  role: UserRole
  avatarUrl?: string | null
  createdAt: Date
}

export interface UserWithStats extends UserBasic {
  coursesCount?: number
  completedQuizzesCount?: number
  enrollmentsCount?: number
  certificatesCount?: number
}
