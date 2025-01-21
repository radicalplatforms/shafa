import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ItemListLoading } from "./ItemListLoading"

export function OutfitSuggestionsCardLoading() {
  return (
    <Card className="overflow-hidden bg-card h-full">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-5" />
        </div>
        <div className="mb-4">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-6 w-full mb-2" />
          <div className="flex gap-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-3 w-10" />
            ))}
          </div>
        </div>
        <Skeleton className="h-px w-full mb-4" />
        <ItemListLoading />
        <div className="mt-4 space-y-1">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardContent>
    </Card>
  )
}

