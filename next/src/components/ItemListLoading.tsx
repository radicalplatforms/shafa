import { Skeleton } from "@/components/ui/skeleton"

export function ItemListLoading() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, index) => (
        <div key={`loading-item-${index}`} className="flex items-start space-x-3">
          <Skeleton className="h-6 w-6 rounded" />
          <div className="flex-grow space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
