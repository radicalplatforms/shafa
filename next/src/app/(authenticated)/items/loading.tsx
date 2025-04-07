import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'

export default function ItemsLoading() {
  // Create an array of item types to show in the filter bar
  const itemTypes = ['top', 'bottom', 'footwear', 'accessory', 'layer']

  return (
    <div className="space-y-6">
      {/* Type filter bar skeleton with archive toggle */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2 pb-1">
          {itemTypes.map((type) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              disabled
              className="py-1 transition-colors whitespace-nowrap bg-transparent px-2 h-7 border-dashed flex items-center gap-1.5 opacity-70"
            >
              <Skeleton className="h-3.5 w-3.5 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled
          className="py-1 transition-colors whitespace-nowrap bg-transparent px-2 h-7 border-dashed flex items-center gap-1.5 opacity-70"
        >
          <Skeleton className="h-3.5 w-3.5 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </Button>
      </div>

      {/* Items list skeleton */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          {/* Search input skeleton - ItemInlineSearch style */}
          <div className="mb-4">
            <div className="flex items-start space-x-3 min-w-0 max-w-full">
              <div className="flex-shrink-0 p-[5px] rounded bg-muted-foreground text-background mt-0.5 opacity-70">
                <Search className="h-[17.5px] w-[17.5px]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col justify-start">
                  <Skeleton className="h-5 w-full mb-1" />
                </div>
              </div>
            </div>
          </div>

          <ul className="space-y-3">
            {Array.from({ length: 10 }).map((_, index) => (
              <li key={index} className="flex items-start space-x-3">
                <Skeleton className="h-7 w-7 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
} 