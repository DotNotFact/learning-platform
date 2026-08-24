import { Card, CardFooter, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function CourseCardSkeleton() {
  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <Skeleton className="w-full h-40 sm:h-48" />
      <CardHeader>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6 mt-2" />
      </CardHeader>
      <div className="flex-1"></div>
      <CardFooter>
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  )
}
