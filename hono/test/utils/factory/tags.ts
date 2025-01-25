import { faker } from '@faker-js/faker'

import { tags } from '../../../src/schema'
import { instance } from '../db'

export interface Tag {
  id: string
  name: string
  hexColor: string
  minDaysBeforeReuse: number
  createdAt: Date
  authorUsername: string
}

export interface TagAPI {
  id: string
  name: string
  hexColor: string
  minDaysBeforeReuse: number
  createdAt: string
  authorUsername: string
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
    this.minDaysBeforeReuse = options?.minDaysBeforeReuse
      ? (options.minDaysBeforeReuse as number)
      : faker.number.int({ min: -1, max: 365 })
    this.createdAt = options?.createdAt
      ? new Date(options.createdAt as Date)
      : new Date(faker.date.past().toISOString().split('T')[0])
    this.authorUsername = options?.authorUsername
      ? (options.authorUsername as string)
      : faker.internet.userName()
  }

  async store(name: string, port: number) {
    const db = instance(name, port)
    await db.insert(tags).values(this).onConflictDoNothing()
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
  minDaysBeforeReuse: number
  createdAt: Date
  authorUsername: string
}

export interface PartialTag {
  name: string
  hexColor: string
  minDaysBeforeReuse: number
}

export class PartialTagFactory implements PartialTag {
  constructor(seed?: number, options?: Partial<PartialTag>) {
    faker.seed(seed ?? undefined)
    this.name = options?.name || faker.word.noun()
    this.hexColor = options?.hexColor || faker.color.rgb({ format: 'hex' })
    this.minDaysBeforeReuse = options?.minDaysBeforeReuse || faker.number.int({ min: -1, max: 365 })
  }

  formatAPI(): PartialTag {
    return {
      ...this,
    }
  }

  name: string
  hexColor: string
  minDaysBeforeReuse: number
}
