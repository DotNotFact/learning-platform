import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { CourseCard } from "@/components/courses/CourseCard"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

type SearchParams = Record<string, string | string[] | undefined>

function asString(v: string | string[] | undefined) {
  return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined
}

function numOrUndefined(v: string | undefined) {
  if (!v) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function makeQuery(current: URLSearchParams, updates: Record<string, string | null>) {
  const q = new URLSearchParams(current.toString())
  for (const [k, v] of Object.entries(updates)) {
    if (v === null || v === "") q.delete(k)
    else q.set(k, v)
  }
  return q.toString()
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams
}) {
  await requireAuth()

  const sp = await Promise.resolve(searchParams ?? {})
  const q = (asString(sp.q) || "").trim()
  const categoryUid = (asString(sp.categoryUid) || "").trim()
  const difficulty = (asString(sp.difficulty) || "").trim()
  const tagUid = (asString(sp.tagUid) || "").trim()
  const sort = (asString(sp.sort) || "order").trim()
  const page = Math.max(numOrUndefined(asString(sp.page)) || 1, 1)
  const limit = Math.min(Math.max(numOrUndefined(asString(sp.limit)) || 12, 1), 60)
  const minPrice = numOrUndefined(asString(sp.minPrice))
  const maxPrice = numOrUndefined(asString(sp.maxPrice))

  const baseParams = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") baseParams.set(k, v)
    else if (Array.isArray(v)) v.forEach((vv) => baseParams.append(k, vv))
  }

  const [categories, tags] = await Promise.all([
    db.category.findMany({ orderBy: { orderIndex: "asc" } }),
    db.tag.findMany({ orderBy: { name: "asc" } }),
  ])

  const where = {
    isPublished: true,
    ...(q
      ? {
          OR: [{ title: { contains: q } }, { description: { contains: q } }],
        }
      : {}),
    ...(categoryUid ? { categoryUid } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(typeof minPrice === "number" || typeof maxPrice === "number"
      ? {
          price: {
            ...(typeof minPrice === "number" ? { gte: minPrice } : {}),
            ...(typeof maxPrice === "number" ? { lte: maxPrice } : {}),
          },
        }
      : {}),
    ...(tagUid
      ? {
          tags: {
            some: { tagUid },
          },
        }
      : {}),
  } as const

  const orderBy =
    sort === "newest"
      ? [{ createdAt: "desc" as const }]
      : sort === "price_asc"
        ? [{ price: "asc" as const }]
        : sort === "price_desc"
          ? [{ price: "desc" as const }]
          : sort === "title"
            ? [{ title: "asc" as const }]
            : [{ orderIndex: "asc" as const }]

  const [total, courses] = await Promise.all([
    db.course.count({ where }),
    db.course.findMany({
      where,
      include: {
        author: { select: { name: true } },
        category: { select: { name: true } },
        tags: { include: { tag: true } },
      },
      orderBy,
      take: limit,
      skip: (page - 1) * limit,
    }),
  ])

  const totalPages = Math.max(Math.ceil(total / limit), 1)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-10">
        <div className="mb-4">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Все курсы</h1>
          <p className="text-lg text-muted-foreground">
            Выберите курс для начала обучения и расширьте свои знания
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{total}</span>
            <span>найдено</span>
          </span>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 mb-8">
        <form method="GET" className="grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Поиск</div>
            <Input name="q" defaultValue={q} placeholder="Название или описание..." />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Категория</div>
            <select
              name="categoryUid"
              defaultValue={categoryUid}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Все</option>
              {categories.map((c) => (
                <option key={c.categoryUid} value={c.categoryUid}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Сложность</div>
            <select
              name="difficulty"
              defaultValue={difficulty}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Любая</option>
              <option value="BEGINNER">BEGINNER</option>
              <option value="INTERMEDIATE">INTERMEDIATE</option>
              <option value="ADVANCED">ADVANCED</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Тег</div>
            <select
              name="tagUid"
              defaultValue={tagUid}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Любой</option>
              {tags.map((t) => (
                <option key={t.tagUid} value={t.tagUid}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-6 grid gap-3 md:grid-cols-6">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Мин. цена</div>
              <Input name="minPrice" defaultValue={minPrice ?? ""} placeholder="0" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Макс. цена</div>
              <Input name="maxPrice" defaultValue={maxPrice ?? ""} placeholder="1000" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Сортировка</div>
              <select
                name="sort"
                defaultValue={sort}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="order">По порядку</option>
                <option value="newest">Сначала новые</option>
                <option value="title">По названию</option>
                <option value="price_asc">Цена ↑</option>
                <option value="price_desc">Цена ↓</option>
              </select>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">На странице</div>
              <select
                name="limit"
                defaultValue={String(limit)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="6">6</option>
                <option value="12">12</option>
                <option value="24">24</option>
              </select>
            </div>
            <div className="md:col-span-2 flex items-end gap-2">
              <Button type="submit" className="w-full md:w-auto">
                Применить
              </Button>
              <Link href="/courses">
                <Button type="button" variant="outline">
                  Сбросить
                </Button>
              </Link>
            </div>
          </div>
        </form>

        {(q || categoryUid || difficulty || tagUid || minPrice || maxPrice || sort !== "order") && (
          <div className="mt-4 flex flex-wrap gap-2">
            {q && <Badge variant="secondary">q: {q}</Badge>}
            {categoryUid && (
              <Badge variant="secondary">
                category: {categories.find((c) => c.categoryUid === categoryUid)?.name || categoryUid}
              </Badge>
            )}
            {difficulty && <Badge variant="secondary">difficulty: {difficulty}</Badge>}
            {tagUid && (
              <Badge variant="secondary">
                tag: {tags.find((t) => t.tagUid === tagUid)?.slug || tagUid}
              </Badge>
            )}
            {typeof minPrice === "number" && <Badge variant="secondary">minPrice: {minPrice}</Badge>}
            {typeof maxPrice === "number" && <Badge variant="secondary">maxPrice: {maxPrice}</Badge>}
            {sort !== "order" && <Badge variant="secondary">sort: {sort}</Badge>}
          </div>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-20">
          <div className="max-w-md mx-auto">
            <div className="mb-4 text-6xl">📚</div>
            <h2 className="text-2xl font-semibold mb-2">Пока нет доступных курсов</h2>
            <p className="text-muted-foreground">
              Новые курсы появятся здесь в ближайшее время
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
            <CourseCard
              key={course.courseUid}
              courseUid={course.courseUid}
              title={course.title}
              description={course.description}
              thumbnailUrl={course.thumbnailUrl}
              authorName={course.author.name}
              categoryName={course.category?.name ?? null}
              difficulty={course.difficulty ?? null}
              price={course.price ?? null}
              tags={course.tags.map((ct) => ({
                tagUid: ct.tag.tagUid,
                name: ct.tag.name,
                slug: ct.tag.slug,
              }))}
            />
          ))}
          </div>

          <div className="flex items-center justify-between mt-10">
            <div className="text-sm text-muted-foreground">
              Страница <span className="font-medium text-foreground">{page}</span> из{" "}
              <span className="font-medium text-foreground">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/courses?${makeQuery(baseParams, { page: String(Math.max(page - 1, 1)) })}`}
                aria-disabled={page <= 1}
              >
                <Button variant="outline" disabled={page <= 1}>
                  ← Назад
                </Button>
              </Link>
              <Link
                href={`/courses?${makeQuery(baseParams, { page: String(Math.min(page + 1, totalPages)) })}`}
                aria-disabled={page >= totalPages}
              >
                <Button variant="outline" disabled={page >= totalPages}>
                  Вперёд →
                </Button>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
