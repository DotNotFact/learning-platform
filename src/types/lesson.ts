
export interface Lesson {
  lessonUid: string
  title: string
  description: string | null
  content: string | null // Markdown
  videoUrl: string | null
  duration: number | null // seconds
  orderIndex: number
  isFree: boolean
  courseUid: string
  createdAt: Date
  updatedAt: Date
}

export interface LessonWithProgress extends Lesson {
  progress?: {
    completed: boolean
    watchedSeconds: number | null
  } | null
}

export interface LessonCreateInput {
  title: string
  description?: string
  content?: string
  videoUrl?: string
  duration?: number
  orderIndex?: number
  isFree?: boolean
  courseUid: string
}
