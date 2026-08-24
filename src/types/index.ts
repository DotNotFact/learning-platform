export * from './course'
export * from './user'
export * from './video'
export * from './quiz'
export * from './api'
export * from './enrollment'
export * from './progress'
export * from './lesson'
export * from './category'
export * from './certificate'
export * from './notification'
export * from './comment'
export * from './assignment'
export * from './tag'

/** @deprecated Use CourseDetails instead */
export type CourseWithRelations = import('./course').CourseDetails

/** @deprecated Use UserBasic instead */
export type { UserBasic } from './user'
