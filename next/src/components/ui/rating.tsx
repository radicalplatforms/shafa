import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingProps {
  rating: number
  maxRating?: number
  className?: string
  starClassName?: string
}

export function Rating({ 
  rating, 
  maxRating = 5, 
  className,
  starClassName
}: RatingProps) {
  return (
    <div className={cn("flex items-center", className)}>
      {[...Array(maxRating)].map((_, index) => (
        <Star
          key={index}
          className={cn(
            "h-4 w-4",
            index < rating ? "text-primary fill-current" : "text-gray-300",
            starClassName
          )}
        />
      ))}
    </div>
  )
} 