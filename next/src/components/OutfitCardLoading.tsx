import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ItemLoading } from "./ItemLoading"

export function OutfitCardLoading() {
  return (
    <Card className="overflow-hidden skeleton-pulse bg-card h-full">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, index) => (
            <ItemLoading key={`loading-item-${index}`} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
