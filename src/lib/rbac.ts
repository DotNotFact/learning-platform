/**
 * Role-Based Access Control (RBAC) System
 * 
 * Defines permissions and access control logic for different user roles.
 * Roles hierarchy: STUDENT < TEACHER < MODERATOR < MANAGER < ADMIN
 */

import type { UserRole } from "@/types"
import { auth } from "@/lib/auth"

export const ROLES = {
  STUDENT: "STUDENT",
  TEACHER: "TEACHER",
  MODERATOR: "MODERATOR",
  MANAGER: "MANAGER",
  ADMIN: "ADMIN",
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

// Иерархия ролей (большее число = больше прав)
const ROLE_HIERARCHY: Record<Role, number> = {
  STUDENT: 1,
  TEACHER: 2,
  MODERATOR: 3,
  MANAGER: 4,
  ADMIN: 5,
}

/**
 * Check if a role has at least the required permission level
 */
export function hasRole(userRole: UserRole, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

/**
 * Check if user can manage courses (create, edit, delete)
 */
export function canManageCourses(role: UserRole): boolean {
  return hasRole(role, ROLES.TEACHER)
}

/**
 * Check if user can moderate content (approve, reject, edit any content)
 */
export function canModerateContent(role: UserRole): boolean {
  return hasRole(role, ROLES.MODERATOR)
}

/**
 * Check if user can manage users (view, edit, delete users)
 */
export function canManageUsers(role: UserRole): boolean {
  return hasRole(role, ROLES.MANAGER)
}

/**
 * Check if user has admin access (full system access)
 */
export function isAdmin(role: UserRole): boolean {
  return role === ROLES.ADMIN
}

/**
 * Check if user can publish courses
 */
export function canPublishCourses(role: UserRole): boolean {
  return hasRole(role, ROLES.MODERATOR)
}

/**
 * Check if user can view analytics/reports
 */
export function canViewAnalytics(role: UserRole): boolean {
  return hasRole(role, ROLES.MANAGER)
}

/**
 * Get all roles that have at least the specified permission level
 */
export function getRolesWithPermission(minRole: Role): Role[] {
  const minLevel = ROLE_HIERARCHY[minRole]
  return Object.entries(ROLE_HIERARCHY)
    .filter(([, level]) => level >= minLevel)
    .map(([role]) => role as Role)
}

/**
 * Server-side helper to get current user role
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const session = await auth()
  return (session?.user?.role as UserRole) || null
}

/**
 * Server-side helper to check if user has required role
 * Throws error if user doesn't have required role
 */
export async function requireRole(requiredRole: Role): Promise<UserRole> {
  const session = await auth()
  if (!session?.user) {
    const error = new Error("Unauthorized") as Error & { statusCode?: number }
    error.statusCode = 401
    throw error
  }

  const userRole = session.user.role as UserRole
  if (!hasRole(userRole, requiredRole)) {
    const error = new Error(`Insufficient permissions. Required: ${requiredRole}`) as Error & { statusCode?: number }
    error.statusCode = 403
    throw error
  }

  return userRole
}

/**
 * Check if user can edit a specific course
 * Teachers can edit their own courses, Moderators+ can edit any course
 */
export function canEditCourse(
  userRole: UserRole,
  courseAuthorUid: string,
  currentUserUid: string
): boolean {
  if (hasRole(userRole, ROLES.MODERATOR)) {
    return true
  }
  if (hasRole(userRole, ROLES.TEACHER)) {
    return courseAuthorUid === currentUserUid
  }
  return false
}

/**
 * Check if user can delete a specific course
 * Only Moderators+ can delete courses
 */
export function canDeleteCourse(role: UserRole): boolean {
  return hasRole(role, ROLES.MODERATOR)
}

/**
 * Check if user can view unpublished courses
 */
export function canViewUnpublishedCourses(role: UserRole): boolean {
  return hasRole(role, ROLES.TEACHER)
}

/**
 * Check if user can enroll in courses
 */
export function canEnrollInCourses(role: UserRole): boolean {
  return role === ROLES.STUDENT || hasRole(role, ROLES.TEACHER)
}
