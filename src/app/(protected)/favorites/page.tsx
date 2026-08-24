import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { CourseCard } from "@/components/courses/CourseCard"
import { FavoriteButton } from "@/components/courses/FavoriteButton"

export default async function FavoritesPage() {
  const session = await requireAuth()
  const userUid = session.user.id

  const favorites = await db.courseFavorite.findMany({
    where: { userUid },
    orderBy: { createdAt: "desc" },
    include: {
      course: {
        include: {
          author: { select: { name: true } },
          category: { select: { name: true } },
          tags: { include: { tag: true } },
        },
      },
    },
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Избранные курсы</h1>
        <p className="text-lg text-muted-foreground">Здесь собраны курсы, которые вы отметили.</p>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-20">
          <div className="max-w-md mx-auto">
            <div className="mb-4 text-6xl">⭐</div>
            <h2 className="text-2xl font-semibold mb-2">Пока пусто</h2>
            <p className="text-muted-foreground">Добавляйте курсы в избранное со страницы курса.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {favorites.map((f) => (
            <div key={`${f.userUid}:${f.courseUid}`} className="relative">
              <div className="absolute right-3 top-3 z-10">
                <FavoriteButton courseUid={f.courseUid} initialIsFavorited={true} size="icon" />
              </div>
              <CourseCard
                courseUid={f.course.courseUid}
                title={f.course.title}
                description={f.course.description}
                thumbnailUrl={f.course.thumbnailUrl}
                authorName={f.course.author.name}
                categoryName={f.course.category?.name ?? null}
                difficulty={f.course.difficulty ?? null}
                price={f.course.price ?? null}
                tags={f.course.tags.map((ct) => ({
                  tagUid: ct.tag.tagUid,
                  name: ct.tag.name,
                  slug: ct.tag.slug,
                }))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

