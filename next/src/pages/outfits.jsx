import { useState } from 'react'
import { Dialog, RadioGroup } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/20/solid'

import Outfit from '@/components/Outfit'

const navigation = [
  { name: 'Product', href: '#' },
  { name: 'Features', href: '#' },
  { name: 'Marketplace', href: '#' },
  { name: 'Company', href: '#' },
]
const pricing = {
  frequencies: [
    { value: 'monthly', label: 'Monthly', priceSuffix: '/month' },
    { value: 'annually', label: 'Annually', priceSuffix: '/year' },
  ],
  tiers: [
    {
      name: 'Hobby',
      id: 'tier-hobby',
      href: '#',
      price: { monthly: '$15', annually: '$144' },
      description: 'The essentials to provide your best work for clients.',
      features: ['5 products', 'Up to 1,000 subscribers', 'Basic analytics'],
      mostPopular: false,
    },
    {
      name: 'Freelancer',
      id: 'tier-freelancer',
      href: '#',
      price: { monthly: '$30', annually: '$288' },
      description: 'The essentials to provide your best work for clients.',
      features: [
        '5 products',
        'Up to 1,000 subscribers',
        'Basic analytics',
        '48-hour support response time',
      ],
      mostPopular: false,
    },
    {
      name: 'Startup',
      id: 'tier-startup',
      href: '#',
      price: { monthly: '$60', annually: '$576' },
      description: 'A plan that scales with your rapidly growing business.',
      features: [
        '25 products',
        'Up to 10,000 subscribers',
        'Advanced analytics',
        '24-hour support response time',
        'Marketing automations',
      ],
      mostPopular: true,
    },
    {
      name: 'Enterprise',
      id: 'tier-enterprise',
      href: '#',
      price: { monthly: '$90', annually: '$864' },
      description: 'Dedicated support and infrastructure for your company.',
      features: [
        'Unlimited products',
        'Unlimited subscribers',
        'Advanced analytics',
        '1-hour, dedicated support response time',
        'Marketing automations',
        'Custom reporting tools',
      ],
      mostPopular: false,
    },
  ],
}

const outfits = [
  {
    items: [
      {
        name: 'Yellow Camp T-shirt', // Name, String literal of name of item
        brand: 'Ralph Lauren', // Brand, String literal of brand of item, should match a brand in User.brands
        photo:
          'https://imogeneandwillie.com/cdn/shop/products/01_759bc5f8-cb7b-4f9f-980e-09ceb1c95942.jpg?v=1680276519', // Photo, String literal of CF Images ID of item
        type: 'top', // Type, String literal of type of item (layer, top, bottom, footwear, accessory)
        rating: 3, // Rating, 0-4, likability of item
        quality: 2, // Quality, 0-4, quality of item
        created_date: new Date(), // Created Date, Date of when item was created
      },
      {
        name: 'Navy Basic T-shirt', // Name, String literal of name of item
        brand: 'Ralph Lauren', // Brand, String literal of brand of item, should match a brand in User.brands
        photo:
          'https://imogeneandwillie.com/cdn/shop/files/01_933ea04f-0dc9-4dea-a1c3-985084c6c8c8_2100x.jpg?v=1687463842', // Photo, String literal of CF Images ID of item
        type: 'layer', // Type, String literal of type of item (layer, top, bottom, footwear, accessory)
        rating: 3, // Rating, 0-4, likability of item
        quality: 2, // Quality, 0-4, quality of item
        created_date: new Date(), // Created Date, Date of when item was created
      },
      {
        name: 'Blue Chinos', // Name, String literal of name of item
        brand: 'Ralph Lauren', // Brand, String literal of brand of item, should match a brand in User.brands
        photo:
          'https://imogeneandwillie.com/cdn/shop/files/bchino_01.jpg?v=1688679935', // Photo, String literal of CF Images ID of item
        type: 'top', // Type, String literal of type of item (layer, top, bottom, footwear, accessory)
        rating: 3, // Rating, 0-4, likability of item
        quality: 2, // Quality, 0-4, quality of item
        created_date: new Date(), // Created Date, Date of when item was created
      },
      {
        name: 'Black RAD One', // Name, String literal of name of item
        brand: 'Ralph Lauren', // Brand, String literal of brand of item, should match a brand in User.brands
        photo:
          'https://rad-global.com/cdn/shop/files/02_RAD_BLACK_DBL_FRONT.jpg?v=1685960434&width=955', // Photo, String literal of CF Images ID of item
        type: 'top', // Type, String literal of type of item (layer, top, bottom, footwear, accessory)
        rating: 3, // Rating, 0-4, likability of item
        quality: 2, // Quality, 0-4, quality of item
        created_date: new Date(), // Created Date, Date of when item was created
      },
    ],
  },
]

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function Example() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [frequency, setFrequency] = useState(pricing.frequencies[0])

  return (
    <div className="bg-white">
      <header>
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8"
          aria-label="Global"
        >
          <a href="#" className="-m-1.5 p-1.5">
            <span className="sr-only">Your Company</span>
            <img
              className="h-8 w-auto"
              src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
              alt=""
            />
          </a>
          <div className="flex lg:hidden">
            <button
              type="button"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">Open main menu</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="hidden lg:flex lg:gap-x-12">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-sm font-semibold leading-6 text-gray-900"
              >
                {item.name}
              </a>
            ))}
            <a
              href="#"
              className="text-sm font-semibold leading-6 text-gray-900"
            >
              Log in <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </nav>
        <Dialog
          as="div"
          className="lg:hidden"
          open={mobileMenuOpen}
          onClose={setMobileMenuOpen}
        >
          <div className="fixed inset-0 z-50" />
          <Dialog.Panel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="flex items-center justify-between">
              <a href="#" className="-m-1.5 p-1.5">
                <span className="sr-only">Your Company</span>
                <img
                  className="h-8 w-auto"
                  src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
                  alt=""
                />
              </a>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div className="space-y-2 py-6">
                  {navigation.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                    >
                      {item.name}
                    </a>
                  ))}
                </div>
                <div className="py-6">
                  <a
                    href="#"
                    className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                  >
                    Log in
                  </a>
                </div>
              </div>
            </div>
          </Dialog.Panel>
        </Dialog>
      </header>

      <main>
        {/* Pricing section */}
        <div className="mx-auto my-16 max-w-7xl px-6 sm:my-16 lg:px-8">
          <div className="mt-8 flex justify-center">
            <RadioGroup
              value={frequency}
              onChange={setFrequency}
              className="grid grid-cols-2 gap-x-1 rounded-full p-1 text-center text-xs font-semibold leading-5 ring-1 ring-inset ring-gray-200"
            >
              <RadioGroup.Label className="sr-only">
                Payment frequency
              </RadioGroup.Label>
              {pricing.frequencies.map((option) => (
                <RadioGroup.Option
                  key={option.value}
                  value={option}
                  className={({ checked }) =>
                    classNames(
                      checked ? 'bg-indigo-600 text-white' : 'text-gray-500',
                      'cursor-pointer rounded-full px-2.5 py-1'
                    )
                  }
                >
                  <span>{option.label}</span>
                </RadioGroup.Option>
              ))}
            </RadioGroup>
          </div>
          <div className="isolate mx-auto mt-10 grid max-w-md grid-cols-1 gap-8 md:max-w-2xl md:grid-cols-2 lg:max-w-4xl xl:mx-0 xl:max-w-none xl:grid-cols-4">
            {outfits.map((outfit) => (
              <Outfit outfit={outfit} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}