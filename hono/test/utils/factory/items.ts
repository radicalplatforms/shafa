import { faker } from '@faker-js/faker'
import { items, itemsExtended, itemTypeEnum } from '../../../src/schema'
import { instance } from '../db'

export type ItemType = 'layer' | 'top' | 'bottom' | 'footwear' | 'accessory'

export interface Item {
  id: string
  name: string
  brand: string
  photoUrl: string
  type: ItemType
  rating: number
  createdAt: Date
  authorUsername: string
}

export interface ItemAPI {
  id: string
  name: string
  brand: string
  photoUrl: string
  type: ItemType
  rating: number
  createdAt: string
  authorUsername: string
}

export class ItemFactory implements Item {
  constructor(seed?: number, options?: Partial<Item> | ItemAPI) {
    faker.seed(seed ?? undefined)
    this.id = options?.id
      ? (options.id as string)
      : faker.string.alphanumeric({ length: 24, casing: 'lower' })
    this.name = options?.name ? (options.name as string) : faker.commerce.productName()
    this.brand = options?.brand ? (options.brand as string) : faker.company.name()
    this.photoUrl = options?.photoUrl
      ? (options.photoUrl as string)
      : faker.image.urlLoremFlickr({ category: 'fashion' })
    this.type = options?.type
      ? (options.type as ItemType)
      : (faker.helpers.arrayElement(itemTypeEnum) as ItemType)
    this.rating = options?.rating
      ? (options.rating as number)
      : faker.number.int({ min: 0, max: 4 })
    this.createdAt = options?.createdAt
      ? new Date(options.createdAt as Date)
      : new Date(faker.date.past().toISOString().split('T')[0])
    this.authorUsername = options?.authorUsername
      ? (options.authorUsername as string)
      : faker.internet.userName()
  }

  async store(name: string, port: number) {
    const db = instance(name, port)
    await db.insert(items).values(this).onConflictDoNothing()
    await db.refreshMaterializedView(itemsExtended)
  }

  formatAPI(): ItemAPI {
    return {
      ...this,
      createdAt: this.createdAt.toISOString(),
    }
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

export interface PartialItem {
  name: string
  brand: string
  photoUrl: string
  type: ItemType
  rating: number
}

export class PartialItemFactory implements PartialItem {
  constructor(seed?: number, options?: Partial<PartialItem>) {
    faker.seed(seed ?? undefined)
    this.name = options?.name || faker.commerce.productName()
    this.brand = options?.brand || faker.company.name()
    this.photoUrl = options?.photoUrl || faker.image.urlLoremFlickr({ category: 'fashion' })
    this.type = options?.type || (faker.helpers.arrayElement(itemTypeEnum) as ItemType)
    this.rating = options?.rating || faker.number.int({ min: 0, max: 4 })
  }

  formatAPI(): PartialItem {
    return {
      ...this,
    }
  }

  name: string
  brand: string
  photoUrl: string
  type: ItemType
  rating: number
}
