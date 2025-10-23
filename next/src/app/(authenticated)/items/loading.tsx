import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ItemLoading } from '@/components/ItemLoading'
import { itemTypeIcons } from '@/components/Item'

export default function ItemsLoading() {
  const itemTypes = Object.keys(itemTypeIcons) as Array<keyof typeof itemTypeIcons>

  return (
    <div className="space-y-6">
      {/* Type filter bar */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2 pb-1">
          {itemTypes.map((type) => {
            const Icon = itemTypeIcons[type]
            return (
              <Button
                key={type}
                variant="outline"
                size="sm"
                disabled
                className="py-1 transition-colors whitespace-nowrap bg-transparent px-2 h-7 border-dashed flex items-center gap-1.5 opacity-70"
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="text-xs text-gray-400">
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </span>
              </Button>
            )
          })}
        </div>
      </div>


      <ul className="space-y-1">
        {Array.from({ length: 10 }).map((_, index) => (
          <li key={index} className="text-sm p-1">
            <ItemLoading />
          </li>
        ))}
      </ul>
    </div>
  )
} 