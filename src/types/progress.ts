
export interface Progress {
  progressUid: string
  userUid: string
  lessonUid: string
  completed: boolean
  watchedSeconds: number | null
  lastWatchedAt: Date | null
  completedAt: Date | null
}

export interface ProgressWithLesson extends Progress {
  lesson: {
    lessonUid: string
    title: string
    duration: number | null
  }
}

export interface CourseProgress {
  courseUid: string
  totalLessons: number
  completedLessons: number
  progress: number // 0-100
  lastAccessedAt: Date | null
}
