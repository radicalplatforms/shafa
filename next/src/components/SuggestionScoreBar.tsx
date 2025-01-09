import React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ScoreCategory {
  name: string
  score: number
  color: string
}

interface SuggestionScoreBarProps {
  totalScore: number
  maxScore: number
  categories: ScoreCategory[]
}

export function SuggestionScoreBar({ totalScore, maxScore, categories }: SuggestionScoreBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-200 mr-2">
          {categories.map((category, index) => (
            <div
              key={index}
              style={{
                width: `${(category.score / maxScore) * 100}%`,
                backgroundColor: category.color,
              }}
              className="h-full"
            />
          ))}
        </div>
        <span className="text-sm font-medium whitespace-nowrap">
          {totalScore.toFixed(2)}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map((category, index) => (
          <TooltipProvider key={index}>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center space-x-1">
                  <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: category.color }} />
                  <span className="text-xs">{category.name}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{category.score.toFixed(2)} points ({((category.score / maxScore) * 100).toFixed(1)}%)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  )
}

