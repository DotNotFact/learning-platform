"use client"

import { useMemo, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToastContext } from "@/components/ToastProvider"
import { Edit, Plus, Trash2 } from "lucide-react"
import type { CategoryWithCount } from "@/types"

type CategoryForm = {
  name: string
  slug: string
  description: string
  orderIndex: number
}

function toForm(cat?: CategoryWithCount): CategoryForm {
  return {
    name: cat?.name || "",
    slug: cat?.slug || "",
    description: cat?.description || "",
    orderIndex: cat?.orderIndex ?? 0,
  }
}

export function CategoriesTable({ initialCategories }: { initialCategories: CategoryWithCount[] }) {
  const [categories, setCategories] = useState<CategoryWithCount[]>(initialCategories)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryWithCount | null>(null)
  const [form, setForm] = useState<CategoryForm>(toForm())
  const [isSaving, setIsSaving] = useState(false)
  const { showToast } = useToastContext()

  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.orderIndex - b.orderIndex),
    [categories]
  )

  const openCreate = () => {
    setEditing(null)
    setForm(toForm())
    setOpen(true)
  }

  const openEdit = (cat: CategoryWithCount) => {
    setEditing(cat)
    setForm(toForm(cat))
    setOpen(true)
  }

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      showToast("Заполните name и slug", "error")
      return
    }
    if (!/^[a-z0-9-]+$/.test(form.slug.trim())) {
      showToast("Slug должен содержать только a-z, 0-9 и '-'", "error")
      return
    }

    setIsSaving(true)
    try {
      if (!editing) {
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            slug: form.slug.trim(),
            description: form.description.trim() || undefined,
            orderIndex: form.orderIndex,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || "Ошибка при создании категории")

        const created: CategoryWithCount = { ...data.category, coursesCount: 0 }
        setCategories((prev) => [created, ...prev])
        showToast("Категория создана", "success")
      } else {
        const res = await fetch(`/api/categories/${editing.categoryUid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            slug: form.slug.trim(),
            description: form.description.trim() || null,
            orderIndex: form.orderIndex,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || "Ошибка при обновлении категории")

        const updated: CategoryWithCount = data.category
        setCategories((prev) =>
          prev.map((c) => (c.categoryUid === updated.categoryUid ? updated : c))
        )
        showToast("Категория обновлена", "success")
      }

      setOpen(false)
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error")
    } finally {
      setIsSaving(false)
    }
  }

  const remove = async (cat: CategoryWithCount) => {
    if (!confirm(`Удалить категорию "${cat.name}"?`)) return
    try {
      const res = await fetch(`/api/categories/${cat.categoryUid}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Ошибка при удалении категории")
      setCategories((prev) => prev.filter((c) => c.categoryUid !== cat.categoryUid))
      showToast("Категория удалена", "success")
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error")
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-muted-foreground text-sm">
          Категории используются для фильтрации курсов.
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Создать категорию
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Порядок</TableHead>
              <TableHead>Курсов</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  Категорий пока нет
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((cat) => (
                <TableRow key={cat.categoryUid} className="hover:bg-accent/50 transition-colors">
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{cat.slug}</Badge>
                  </TableCell>
                  <TableCell>{cat.orderIndex}</TableCell>
                  <TableCell>{cat.coursesCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(cat)} title="Редактировать">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(cat)}
                        title="Удалить"
                        className="hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Редактировать категорию" : "Создать категорию"}</DialogTitle>
            <DialogDescription>
              Slug используется в URL и фильтрах (только латиница, цифры и '-').
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Название</div>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Slug</div>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Описание</div>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Порядок (orderIndex)</div>
              <Input
                type="number"
                value={String(form.orderIndex)}
                onChange={(e) => setForm({ ...form, orderIndex: Number(e.target.value || 0) })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
              Отмена
            </Button>
            <Button onClick={save} disabled={isSaving}>
              {isSaving ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

