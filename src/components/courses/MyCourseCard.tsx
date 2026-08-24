import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import Image from "next/image"
import { Play, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface MyCourseCardProps {
  courseUid: string
  title: string
  description?: string | null
  thumbnailUrl?: string | null
  authorName?: string | null
  progress: number // 0-100
  enrolledAt: Date
  completedAt?: Date | null
}

export function MyCourseCard({
  courseUid,
  title,
  description: _description,
  thumbnailUrl,
  authorName,
  progress,
  enrolledAt: _enrolledAt,
  completedAt,
}: MyCourseCardProps) {
  const isCompleted = progress >= 100 || completedAt !== null

  return (
    <Card className="flex flex-col h-full overflow-hidden hover:shadow-lg transition-all duration-300 border-2">
      {thumbnailUrl && (
        <div className="relative w-full h-36 sm:h-40 bg-linear-to-br from-gray-100 to-gray-200 overflow-hidden shrink-0">
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover"
            unoptimized
          />
          {isCompleted && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-green-500 hover:bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Завершен
              </Badge>
            </div>
          )}
        </div>
      )}
      <div className="flex flex-col flex-1 min-h-0">
        <CardHeader className="shrink-0">
          <CardTitle className="line-clamp-2 wrap-break-word text-base sm:text-lg font-bold">
            {title}
          </CardTitle>
          {authorName && (
            <p className="text-xs text-muted-foreground mt-1">Автор: {authorName}</p>
          )}
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-end">
          {/* Прогресс */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Прогресс</span>
              <span className="font-semibold">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
        <CardFooter className="shrink-0 pt-4 pb-4">
          <Link href={`/courses/${courseUid}`} className="w-full">
            <Button
              className="w-full sm:h-11 sm:px-8"
              size="default"
              variant={isCompleted ? "outline" : "default"}
            >
              {isCompleted ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Просмотреть курс
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Продолжить обучение
                </>
              )}
            </Button>
          </Link>
        </CardFooter>
      </div>
    </Card>
  )
}
