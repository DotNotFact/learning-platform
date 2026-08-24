import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { requireRole, ROLES, type Role } from "@/lib/rbac"

/**
 * Require user to be authenticated
 */
export async function requireAuth() {
  const session = await auth()
  if (!session) {
    redirect("/login")
  }
  return session
}

/**
 * Require user to have admin role
 * @deprecated Use requireRole(ROLES.ADMIN) instead
 */
export async function requireAdmin() {
  const session = await requireAuth()
  if (session.user.role !== ROLES.ADMIN) {
    redirect("/dashboard")
  }
  return session
}

/**
 * Require user to have at least the specified role
 */
export async function requireMinimumRole(role: Role) {
  await requireRole(role)
  return await requireAuth()
}

/**
 * Require user to be a teacher or higher
 */
export async function requireTeacher() {
  return requireMinimumRole(ROLES.TEACHER)
}

/**
 * Require user to be a moderator or higher
 */
export async function requireModerator() {
  return requireMinimumRole(ROLES.MODERATOR)
}

/**
 * Require user to be a manager or higher
 */
export async function requireManager() {
  return requireMinimumRole(ROLES.MANAGER)
}
