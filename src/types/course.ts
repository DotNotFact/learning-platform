
import type { Video } from './video'
import type { QuizWithQuestions } from './quiz'
import type { Lesson } from './lesson'
import type { Category } from './category'

export interface Course {
  courseUid: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  categoryUid: string | null
  orderIndex: number
  isPublished: boolean
  difficulty: string | null // BEGINNER, INTERMEDIATE, ADVANCED
  estimatedHours: number | null
  price: number | null
  createdAt: Date
  updatedAt: Date
  authorUid: string
}

export interface CourseAuthor {
  name: string | null
  email: string
}

export interface CourseWithAuthor extends Course {
  author: CourseAuthor
  category?: Category | null
}

// Минимальные данные для списка курсов
export type CourseListItem = CourseWithAuthor

export interface CourseDetails extends CourseWithAuthor {
  lessons: Lesson[]
  quizzes: QuizWithQuestions[]
  videos?: Video[]
}
export interface CourseDetailsLegacy extends CourseWithAuthor {
  videos: Video[]
  quizzes: QuizWithQuestions[]
}
