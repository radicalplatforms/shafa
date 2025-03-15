import { OutfitSuggestionsCardLoading } from './OutfitSuggestionsCardLoading'
import { Skeleton } from "@/components/ui/skeleton"

export default function OutfitListLoading() {
  return (
    <div className="space-y-6">
      {/* Tags filter section loading state */}
      <div className="flex flex-wrap gap-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-6 w-16 rounded-md" />
        ))}
      </div>
      
      {/* Suggestions grid loading state */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(9)].map((_, index) => (
          <OutfitSuggestionsCardLoading key={`suggestion-skeleton-${index}`}/>
        ))}
      </div>
    </div>
  )
} 