
export interface Video {
  videoUid: string
  title: string
  description: string | null
  videoUrl: string
  duration: number | null // секунды
  orderIndex: number
  courseUid: string
  createdAt: Date
}

export interface VideoCreateInput {
  title: string
  description?: string | null
  videoUrl: string
  duration?: number | null
  orderIndex?: number
}

export interface VideoUpdateInput {
  title?: string
  description?: string | null
  videoUrl?: string
  duration?: number | null
  orderIndex?: number
}
