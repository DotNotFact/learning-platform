import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"

interface CourseCardProps {
  courseUid: string
  title: string
  description?: string | null
  thumbnailUrl?: string | null
  authorName?: string | null
  categoryName?: string | null
  difficulty?: string | null
  price?: number | null
  tags?: Array<{ tagUid: string; name: string; slug: string }>
  href?: string
}

export function CourseCard({
  courseUid,
  title,
  description,
  thumbnailUrl,
  authorName,
  categoryName,
  difficulty,
  price,
  tags,
  href,
}: CourseCardProps) {
  const difficultyLabel =
    difficulty === "BEGINNER"
      ? "Начальный"
      : difficulty === "INTERMEDIATE"
        ? "Средний"
        : difficulty === "ADVANCED"
          ? "Продвинутый"
          : difficulty

  return (
    <Card className="flex flex-col h-full overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/30 group cursor-pointer">
      {thumbnailUrl && (
        <div className="relative w-full h-40 sm:h-48 bg-linear-to-br from-gray-100 to-gray-200 overflow-hidden shrink-0">
          <Image 
            src={thumbnailUrl} 
            alt={title} 
            fill 
            className="object-cover transition-transform duration-500 group-hover:scale-110" 
            unoptimized 
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      )}
      <div className="flex flex-col flex-1 min-h-0">
        <CardHeader className="shrink-0">
          <CardTitle className="line-clamp-2 wrap-break-word text-lg sm:text-xl font-bold">
            {title}
          </CardTitle>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
            {categoryName && (
              <Badge variant="secondary" className="font-normal">
                {categoryName}
              </Badge>
            )}
            {difficulty && (
              <Badge variant="outline" className="font-normal">
                {difficultyLabel}
              </Badge>
            )}
            {typeof price === "number" && (
              <Badge className="font-normal">
                {price <= 0 ? "Бесплатно" : `${price} ₽`}
              </Badge>
            )}
          </div>
          {description && (
            <CardDescription className="line-clamp-3 wrap-break-word mt-2 text-sm leading-relaxed">
              {description}
            </CardDescription>
          )}
        </CardHeader>
        {tags && tags.length > 0 && (
          <CardContent className="shrink-0 pt-0">
            <div className="flex flex-wrap gap-1.5">
              {tags.slice(0, 3).map((t) => (
                <Badge key={t.tagUid} variant="outline" className="font-normal">
                  #{t.slug}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="outline" className="font-normal">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          </CardContent>
        )}
        {authorName && (
          <CardContent className="shrink-0 pt-0">
            <p className="text-sm text-muted-foreground font-medium">Автор: {authorName}</p>
          </CardContent>
        )}
        <div className="flex-1"></div>
        <CardFooter className="shrink-0 pt-3 sm:pt-4 pb-4">
          <Link href={href ?? `/courses/${courseUid}`} className="w-full">
            <Button
              className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 sm:h-11 sm:px-8"
              size="default"
            >
              Открыть курс
              <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300 inline-block">→</span>
            </Button>
          </Link>
        </CardFooter>
      </div>
    </Card>
  )
}
