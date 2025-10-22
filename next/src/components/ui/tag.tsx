import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface TagProps {
  name: string
  hexColor?: string
  icon?: ReactNode
  selected?: boolean
  compact?: boolean
  onClick?: () => void
}

export function Tag({ name, hexColor, icon, selected = false, compact = true, onClick }: TagProps) {
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
      {icon ? (
        icon
      ) : hexColor ? (
        <div 
          className="w-2 h-2 rounded-full" 
          style={{ backgroundColor: hexColor }}
        />
      ) : null}
      <span className={cn(
        "text-xs",
        selected ? "" : "text-gray-400"
      )}>
        {name}
      </span>
    </Button>
  )
}