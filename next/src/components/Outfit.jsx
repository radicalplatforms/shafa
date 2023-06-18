import OutfitItem from './OutfitItem'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function Outfit({ outfit, loading }) {
  return (
    <div
      key={outfit.id}
      className={classNames(
        outfit.isToday ? 'ring-2 ring-indigo-600' : 'ring-1 ring-gray-200',
        'rounded-3xl p-3'
      )}
    >
      <div className="isolate mx-auto grid grid-cols-2 gap-3">
        {outfit.items.map((item) => (
          <OutfitItem item={item} loading={loading} />
        ))}
      </div>
    </div>
  )
}