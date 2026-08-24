
import type { CourseDetails, CourseListItem } from './course'
import type { UserBasic } from './user'
import type { QuizWithQuestions } from './quiz'
import type { Video } from './video'

export interface CourseListResponse {
  courses: CourseListItem[]
}

export interface CourseDetailsResponse {
  course: CourseDetails
}

export interface CourseCreateResponse {
  course: CourseListItem
}

export interface UserListResponse {
  users: UserBasic[]
}

export interface QuizDetailsResponse {
  quiz: QuizWithQuestions
}

export interface QuizListResponse {
  quizzes: QuizWithQuestions[]
}

export interface VideoListResponse {
  videos: Video[]
}

export interface ApiErrorResponse {
  error: string
  details?: unknown
}

export interface ApiSuccessResponse<T = unknown> {
  data: T
  message?: string
}
