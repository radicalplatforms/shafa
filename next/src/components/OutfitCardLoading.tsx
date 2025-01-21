import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ItemListLoading } from "./ItemListLoading"

export function OutfitCardLoading() {
  return (
    <Card className="overflow-hidden skeleton-pulse bg-card h-full">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-5" />
        </div>
        <ItemListLoading />
      </CardContent>
    </Card>
  )
}
