import { faker } from '@faker-js/faker'

import { tagStatusEnum, tagsToItems } from '../../../src/schema'
import { instance } from '../db'

export interface TagToItem {
  tagId: string
  itemId: string
  status: (typeof tagStatusEnum)[number]
}

export class TagToItemFactory implements TagToItem {
  constructor(seed: number | undefined, options: TagToItem | Omit<TagToItem, 'status'>) {
    faker.seed(seed)
    this.tagId = options.tagId
    this.itemId = options.itemId
    this.status =
      'status' in options
        ? options.status
        : (faker.helpers.arrayElement(tagStatusEnum) as (typeof tagStatusEnum)[number])
  }

  async store(name: string, port: number) {
    const db = instance(name, port)
    await db.insert(tagsToItems).values(this).onConflictDoNothing()
  }

  tagId: string
  itemId: string
  status: (typeof tagStatusEnum)[number]
}
