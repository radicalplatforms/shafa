import { OutfitSuggestionsCardLoading } from './OutfitSuggestionsCardLoading'

export default function OutfitListLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 fade-out-br">
      {[...Array(9)].map((_, index) => (
        <OutfitSuggestionsCardLoading key={`suggestion-skeleton-${index}`}/>
      ))}
    </div>
  )
} 