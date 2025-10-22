import { ItemLoading } from "./ItemLoading"

export function ItemListLoading() {
  return (
    <div className="space-y-2">
      {[...Array(4)].map((_, index) => (
        <ItemLoading key={`loading-item-${index}`} />
      ))}
    </div>
  )
}
