import { UserIcon, StarIcon } from '@heroicons/react/20/solid'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function OutfitItem({ item, loading }) {
  return (
    <article
      key={item.id}
      className="relative isolate flex h-[14rem] w-[12rem] flex-col justify-end overflow-hidden rounded-2xl bg-gray-900 px-3 pb-1"
    >
      <img
        src={item.photo}
        alt=""
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-gray-900 via-gray-900/30" />
      <div className="absolute inset-0 -z-10 rounded-2xl ring-1 ring-inset ring-gray-900/10" />

      <input
        type="text"
        name="name"
        id="name"
        className="mt-3 bg-transparent text-sm font-semibold leading-4 text-white focus:outline-none focus:ring-0"
        defaultValue={item.name}
      />
      <input
        type="text"
        name="name"
        id="name"
        className="mb-1 bg-transparent text-xs font-semibold leading-4 text-gray-300 focus:outline-none focus:ring-0"
        defaultValue={item.brand}
      />
      <div className="mb-2 flex justify-between">
        <div className="flex">
          {[0, 1, 2, 3, 4].map((rating) => (
            <StarIcon
              key={rating}
              className={classNames(
                item.rating > rating ? 'text-yellow-500' : 'text-gray-500',
                'h-3 w-3 flex-shrink-0'
              )}
              aria-hidden="true"
            />
          ))}
        </div>
        <div className="flex">
          <UserIcon
            className="h-3 w-3 flex-shrink-0 text-gray-400"
            aria-hidden="true"
          />
        </div>
      </div>
    </article>
  )
}