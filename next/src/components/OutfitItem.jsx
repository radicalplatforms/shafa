function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function OutfitItem({ item, loading }) {
  return (
    <article
      key={item.id}
      className="relative isolate flex flex-col justify-end overflow-hidden rounded-2xl bg-gray-900 px-3 pb-1 pt-80 sm:pt-48 lg:pt-20"
    >
      <img
        src={item.photo}
        alt=""
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-gray-900 via-gray-900/40" />
      <div className="absolute inset-0 -z-10 rounded-2xl ring-1 ring-inset ring-gray-900/10" />

      <h3 className="mt-3 text-xs font-semibold leading-6 text-white">
        <a href={item.href}>
          <span className="absolute inset-0" />
          {item.name}
        </a>
      </h3>
    </article>
  )
}