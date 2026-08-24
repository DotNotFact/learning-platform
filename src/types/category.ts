
export interface Category {
  categoryUid: string
  name: string
  slug: string
  description: string | null
  orderIndex: number
  createdAt: Date
  updatedAt: Date
}

export interface CategoryWithCount extends Category {
  coursesCount: number
}
