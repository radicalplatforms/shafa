import { faker } from '@faker-js/faker'
import { createId } from '@paralleldrive/cuid2'

type ItemType = 'layer' | 'top' | 'bottom' | 'footwear' | 'accessory'

export class ItemFactory {
  constructor(seed?: number, options?: Partial<ItemFactory>) {
    if (seed !== undefined) {
      faker.seed(seed)
    }
    this.id = options?.id || createId()
    this.name = options?.name || faker.commerce.productName()
    this.brand = options?.brand || faker.company.name()
    this.photoUrl = options?.photoUrl || faker.image.urlLoremFlickr({ category: 'fashion' })
    this.type =
      options?.type ||
      faker.helpers.arrayElement(['layer', 'top', 'bottom', 'footwear', 'accessory'])
    this.rating = options?.rating || faker.number.int({ min: 0, max: 4 })
    this.createdAt = options?.createdAt || faker.date.anytime()
    this.authorUsername = options?.authorUsername || faker.internet.userName()
  }

  id: string
  name: string
  brand: string
  photoUrl: string
  type: ItemType
  rating: number
  createdAt: Date
  authorUsername: string
}

export class PartialItemFactory {
  constructor(seed?: number, options?: Partial<PartialItemFactory>) {
    if (seed !== undefined) {
      faker.seed(seed)
    }
    this.name = options?.name || faker.commerce.productName()
    this.brand = options?.brand || faker.company.name()
    this.photoUrl = options?.photoUrl || faker.image.urlLoremFlickr({ category: 'fashion' })
    this.type =
      options?.type ||
      faker.helpers.arrayElement(['layer', 'top', 'bottom', 'footwear', 'accessory'])
    this.rating = options?.rating || faker.number.int({ min: 0, max: 4 })
  }

  name: string
  brand: string
  photoUrl: string
  type: ItemType
  rating: number
}
