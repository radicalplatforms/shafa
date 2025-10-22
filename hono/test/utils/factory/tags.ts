import { faker } from '@faker-js/faker'

import { tag } from '../../../src/schema'
import { instance } from '../db'

export interface Tag {
  id: string
  name: string
  hexColor: string
  minDaysBeforeItemReuse: number
  createdAt: Date
  userId: string
}

export interface TagAPI {
  id: string
  name: string
  hexColor: string
  minDaysBeforeItemReuse: number
  createdAt: string
  userId: string
}

export class TagFactory implements Tag {
  constructor(seed?: number, options?: Partial<Tag> | TagAPI) {
    faker.seed(seed ?? undefined)
    this.id = options?.id
      ? (options.id as string)
      : faker.string.alphanumeric({ length: 24, casing: 'lower' })
    this.name = options?.name ? (options.name as string) : faker.word.noun()
    this.hexColor = options?.hexColor
      ? (options.hexColor as string)
      : faker.color.rgb({ format: 'hex' })
    this.minDaysBeforeItemReuse = options?.minDaysBeforeItemReuse
      ? (options.minDaysBeforeItemReuse as number)
      : faker.number.int({ min: -1, max: 365 })
    this.createdAt = options?.createdAt
      ? new Date(options.createdAt as Date)
      : new Date(faker.date.past().toISOString().split('T')[0])
    this.userId = options?.userId ? (options.userId as string) : faker.internet.userName()
  }

  async store(name: string, port: number) {
    const db = instance(name, port)
    await db.insert(tag).values(this).onConflictDoNothing()
  }

  formatAPI(): TagAPI {
    return {
      ...this,
      createdAt: this.createdAt.toISOString(),
    }
  }

  id: string
  name: string
  hexColor: string
  minDaysBeforeItemReuse: number
  createdAt: Date
  userId: string
}

export interface PartialTag {
  name: string
  hexColor: string
  minDaysBeforeItemReuse: number
}

export class PartialTagFactory implements PartialTag {
  constructor(seed?: number, options?: Partial<PartialTag>) {
    faker.seed(seed ?? undefined)
    this.name = options?.name || faker.word.noun()
    this.hexColor = options?.hexColor || faker.color.rgb({ format: 'hex' })
    this.minDaysBeforeItemReuse =
      options?.minDaysBeforeItemReuse || faker.number.int({ min: -1, max: 365 })
  }

  formatAPI(): PartialTag {
    return {
      ...this,
    }
  }

  name: string
  hexColor: string
  minDaysBeforeItemReuse: number
}
