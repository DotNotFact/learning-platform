/**
 * Comment types for the learning platform
 */

export interface Comment {
  commentUid: string
  content: string
  userUid: string
  courseUid: string
  parentUid: string | null
  isApproved: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CommentWithUser extends Comment {
  user: {
    userUid: string
    name: string | null
    email: string
    avatarUrl: string | null
  }
  replies?: CommentWithUser[]
}

export interface CreateCommentInput {
  content: string
  courseUid: string
  parentUid?: string | null
}

export interface UpdateCommentInput {
  content?: string
  isApproved?: boolean
}

export interface CommentResponse {
  comment: CommentWithUser
}

export interface CommentsResponse {
  comments: CommentWithUser[]
  total: number
}
