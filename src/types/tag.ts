export interface Tag {
  tagUid: string
  name: string
  slug: string
  createdAt: Date
}

export interface TagWithCount extends Tag {
  coursesCount: number
}

