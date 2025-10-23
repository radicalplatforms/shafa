import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

/**
 * Base tag styling and behavior.
 */
const baseTagClasses = "py-1 px-2 h-6 text-xs transition-colors whitespace-nowrap bg-transparent border-dashed hover:bg-muted/50 flex items-center gap-1.5"

interface FilterTagProps {
  name: string
  hexColor: string
  selected?: boolean
  onClick?: () => void
}

/**
 * Interactive tag with colored dot for filtering/selection.
 * 
 * @example <FilterTag name="Casual" hexColor="#3b82f6" selected onClick={handleClick} />
 */
export function FilterTag({ name, hexColor, selected = false, onClick }: FilterTagProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        baseTagClasses,
        selected ? "border-solid" : "border-dashed"
      )}
    >
      <div 
        className="w-2 h-2 rounded-full" 
        style={{ backgroundColor: hexColor }}
      />
      <span className={selected ? "text-foreground" : "text-muted-foreground"}>
        {name}
      </span>
    </Button>
  )
}

interface CountTagProps {
  name: string
  hexColor: string
  count: number
}

/**
 * Display-only tag showing usage count in the tag's color.
 * 
 * @example <CountTag name="Casual" hexColor="#3b82f6" count={5} />
 */
export function CountTag({ name, hexColor, count }: CountTagProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border border-dashed bg-transparent">
      <span 
        className="font-medium" 
        style={{ color: hexColor }}
      >
        {count}
      </span>
      <span className="text-muted-foreground">
        {name}
      </span>
    </span>
  )
}

interface IconTagProps {
  name: string
  icon: ReactNode
  selected?: boolean
  onClick?: () => void
}

/**
 * Interactive tag with custom icon.
 * 
 * @example <IconTag name="Favorites" icon={<Heart />} selected onClick={handleClick} />
 */
export function IconTag({ name, icon, selected = false, onClick }: IconTagProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        baseTagClasses,
        selected ? "border-solid" : "border-dashed"
      )}
    >
      {icon}
      <span className={selected ? "text-foreground" : "text-muted-foreground"}>
        {name}
      </span>
    </Button>
  )
}