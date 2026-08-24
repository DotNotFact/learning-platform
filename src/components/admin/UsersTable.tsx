import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ru } from "date-fns/locale/ru"
import type { UserBasic } from "@/types"

interface UsersTableProps {
  users: UserBasic[]
}

export function UsersTable({ users }: UsersTableProps) {
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "destructive"
      case "MANAGER":
        return "default"
      case "MODERATOR":
        return "default"
      case "TEACHER":
        return "secondary"
      default:
        return "secondary"
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Администратор"
      case "MANAGER":
        return "Менеджер"
      case "MODERATOR":
        return "Модератор"
      case "TEACHER":
        return "Преподаватель"
      default:
        return "Студент"
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Имя</TableHead>
            <TableHead>Роль</TableHead>
            <TableHead>Дата регистрации</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Нет пользователей
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.userUid}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>{user.name || "—"}</TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(user.role)}>{getRoleLabel(user.role)}</Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(user.createdAt), "dd MMM yyyy", { locale: ru })}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
