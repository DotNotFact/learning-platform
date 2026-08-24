
export interface Quiz {
  quizUid: string
  title: string
  description: string | null
  courseUid: string
  createdAt: Date
  updatedAt: Date
}

export interface Question {
  questionUid: string
  text: string
  options: QuestionOption[] | string // Может быть массивом или JSON строкой (для SQLite)
  correctOptions: string[] | string // UUIDs правильных ответов, может быть массивом или JSON строкой
  explanation: string | null
  quizUid: string
  orderIndex: number
}

export interface QuestionParsed {
  questionUid: string
  text: string
  options: QuestionOption[] // Всегда массив после парсинга
  correctOptions: string[] // Всегда массив после парсинга
  explanation: string | null
  quizUid: string
  orderIndex: number
}

export interface QuestionOption {
  optionUid: string
  text: string
}

export interface QuizWithQuestions extends Quiz {
  questions: Question[]
}

export interface QuizAttempt {
  attemptUid: string
  userUid: string
  quizUid: string
  score: number // правильных ответов
  totalQuestions: number
  percentage: number // 0-100
  passed?: boolean
  timeSpent?: number | null
  answers?: string | null
  completedAt: Date
}

export interface QuizCreateInput {
  title: string
  description?: string | null
}

export interface QuestionCreateInput {
  text: string
  options: QuestionOption[]
  correctOptions: string[]
  explanation?: string | null
  orderIndex?: number
}
