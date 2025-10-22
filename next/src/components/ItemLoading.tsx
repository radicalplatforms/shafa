import { Skeleton } from "@/components/ui/skeleton"

export function ItemLoading() {
  return (
    <div className="flex items-start space-x-3 min-w-0 max-w-full">
      {/* Icon skeleton - matches the item type icon container */}
      <div className="flex-shrink-0 p-[4px] rounded mt-0.5 border-2 border-muted-foreground bg-muted-foreground">
        <Skeleton className="h-[17.5px] w-[17.5px] rounded" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col justify-start mt-0.5">
          {/* Item name skeleton */}
          <Skeleton className="h-[16.5px] w-[160px] mb-0.5" />
          {/* Item details skeleton */}
          <div className="flex items-center space-x-1">
            <Skeleton className="h-2 w-16" />
            <span className="text-xs text-muted">•</span>
            <Skeleton className="h-2 w-12" />
          </div>
        </div>
      </div>
    </div>
  )
}
