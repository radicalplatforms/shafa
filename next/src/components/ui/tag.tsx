import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TagProps {
  name: string
  hexColor?: string
  selected?: boolean
  compact?: boolean
  onClick?: () => void
}

export function Tag({ name, hexColor, selected = false, compact = true, onClick }: TagProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        "py-1 transition-colors whitespace-nowrap bg-transparent",
        compact ? "px-2 h-6" : "px-3 h-7",
        selected 
          ? "border" 
          : "hover:bg-muted/50 border-dashed",
        "flex items-center gap-1.5"
      )}
    >
      {hexColor && <div 
        className="w-2 h-2 rounded-full" 
        style={{ backgroundColor: hexColor }}
      />}
      <span className={cn(
        "text-xs",
        selected ? "" : "text-gray-400"
      )}>
        {name}
      </span>
    </Button>
  )
}