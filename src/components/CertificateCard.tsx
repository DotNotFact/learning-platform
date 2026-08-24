import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Award, Calendar, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale/ru"
import Image from "next/image"

interface CertificateCardProps {
  certificateUid: string
  courseUid: string
  courseTitle: string
  courseThumbnailUrl?: string | null
  courseDescription?: string | null
  authorName?: string | null
  issuedAt: Date
  certificateUrl?: string | null
}

export function CertificateCard({
  certificateUid: _certificateUid,
  courseUid,
  courseTitle,
  courseThumbnailUrl,
  courseDescription,
  authorName,
  issuedAt,
  certificateUrl,
}: CertificateCardProps) {
  const formattedDate = format(new Date(issuedAt), "d MMMM yyyy", { locale: ru })

  return (
    <Card className="border-2 hover:shadow-lg transition-all duration-300 overflow-hidden">
      {courseThumbnailUrl && (
        <div className="relative w-full h-40 bg-linear-to-br from-gray-100 to-gray-200 overflow-hidden">
          <Image
            src={courseThumbnailUrl}
            alt={courseTitle}
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute top-2 right-2">
            <Badge className="bg-green-500 hover:bg-green-600 text-white">
              <Award className="h-3 w-3 mr-1" />
              Сертификат
            </Badge>
          </div>
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-xl font-bold line-clamp-2">{courseTitle}</CardTitle>
          {!courseThumbnailUrl && (
            <Badge className="bg-green-500 hover:bg-green-600 text-white shrink-0">
              <Award className="h-3 w-3 mr-1" />
              Сертификат
            </Badge>
          )}
        </div>
        {authorName && (
          <p className="text-sm text-muted-foreground mt-1">Автор: {authorName}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {courseDescription && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {courseDescription}
          </p>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Выдан: {formattedDate}</span>
        </div>
        <div className="flex gap-2">
          <Link href={`/courses/${courseUid}`} className="flex-1">
            <Button variant="outline" className="w-full" size="sm">
              Просмотреть курс
            </Button>
          </Link>
          {certificateUrl && (
            <a href={certificateUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="default" size="sm">
                <ExternalLink className="h-4 w-4 mr-1" />
                Открыть
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
