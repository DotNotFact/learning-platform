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
import { useToastContext } from "@/components/ToastProvider"
import { Edit, Plus, Trash2 } from "lucide-react"
import type { TagWithCount } from "@/types"

type TagForm = {
  name: string
  slug: string
}

function toForm(tag?: TagWithCount): TagForm {
  return {
    name: tag?.name || "",
    slug: tag?.slug || "",
  }
}

export function TagsTable({ initialTags }: { initialTags: TagWithCount[] }) {
  const [tags, setTags] = useState<TagWithCount[]>(initialTags)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TagWithCount | null>(null)
  const [form, setForm] = useState<TagForm>(toForm())
  const [isSaving, setIsSaving] = useState(false)
  const { showToast } = useToastContext()

  const sorted = useMemo(
    () => [...tags].sort((a, b) => a.name.localeCompare(b.name)),
    [tags]
  )

  const openCreate = () => {
    setEditing(null)
    setForm(toForm())
    setOpen(true)
  }

  const openEdit = (tag: TagWithCount) => {
    setEditing(tag)
    setForm(toForm(tag))
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
        const res = await fetch("/api/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            slug: form.slug.trim(),
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || "Ошибка при создании тега")

        const created: TagWithCount = { ...data.tag, coursesCount: 0 }
        setTags((prev) => [created, ...prev])
        showToast("Тег создан", "success")
      } else {
        const res = await fetch(`/api/tags/${editing.tagUid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            slug: form.slug.trim(),
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || "Ошибка при обновлении тега")

        const updated: TagWithCount = data.tag
        setTags((prev) => prev.map((t) => (t.tagUid === updated.tagUid ? updated : t)))
        showToast("Тег обновлён", "success")
      }

      setOpen(false)
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error")
    } finally {
      setIsSaving(false)
    }
  }

  const remove = async (tag: TagWithCount) => {
    if (!confirm(`Удалить тег "${tag.name}"?`)) return
    try {
      const res = await fetch(`/api/tags/${tag.tagUid}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Ошибка при удалении тега")
      setTags((prev) => prev.filter((t) => t.tagUid !== tag.tagUid))
      showToast("Тег удалён", "success")
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error")
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-muted-foreground text-sm">
          Теги используются для фильтрации и тематической группировки курсов.
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Создать тег
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Курсов</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                  Тегов пока нет
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((tag) => (
                <TableRow key={tag.tagUid} className="hover:bg-accent/50 transition-colors">
                  <TableCell className="font-medium">{tag.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{tag.slug}</Badge>
                  </TableCell>
                  <TableCell>{tag.coursesCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(tag)}
                        title="Редактировать"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(tag)}
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
            <DialogTitle>{editing ? "Редактировать тег" : "Создать тег"}</DialogTitle>
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

