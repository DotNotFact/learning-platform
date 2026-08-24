export interface Assignment {
  assignmentUid: string
  title: string
  description: string | null
  instructions: string | null
  videoUrl?: string | null
  imageUrl?: string | null
  resourceUrl?: string | null
  meetingUrl?: string | null
  dueDate: Date | null
  maxScore: number
  lessonUid: string | null
  quizUid?: string | null
  authorUid: string
  createdAt: Date
  updatedAt: Date
}

export interface AssignmentWithLessonAndCourse extends Assignment {
  lesson: {
    lessonUid: string
    title: string
    courseUid: string
    course: {
      courseUid: string
      title: string
      authorUid: string
    }
  } | null
}

export interface AssignmentSubmission {
  submissionUid: string
  assignmentUid: string
  userUid: string
  content: string
  score: number | null
  feedback: string | null
  submittedAt: Date
  gradedAt: Date | null
}

export interface AssignmentSubmissionWithUser extends AssignmentSubmission {
  user: {
    userUid: string
    name: string | null
    email: string
  }
}
