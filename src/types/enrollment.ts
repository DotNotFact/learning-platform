
export interface Enrollment {
  enrollmentUid: string
  userUid: string
  courseUid: string
  enrolledAt: Date
  completedAt: Date | null
  progress: number // 0-100
}

export interface EnrollmentWithCourse extends Enrollment {
  course: {
    courseUid: string
    title: string
    thumbnailUrl: string | null
  }
}

export interface EnrollmentWithDetails extends Enrollment {
  course: {
    courseUid: string
    title: string
    description: string | null
    thumbnailUrl: string | null
    author: {
      name: string | null
    }
  }
}
