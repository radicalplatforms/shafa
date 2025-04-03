import { OutfitCardLoading } from './OutfitCardLoading'

export default function OutfitListLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 fade-out-br">
      {[...Array(9)].map((_, index) => (
        <OutfitCardLoading key={`outfit-skeleton-${index}`}/>
      ))}
    </div>
  )
} 