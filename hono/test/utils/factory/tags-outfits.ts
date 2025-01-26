import { faker } from '@faker-js/faker'

import { tagStatusEnum, tagsToOutfits } from '../../../src/schema'
import { instance } from '../db'

export interface TagToOutfit {
  tagId: string
  outfitId: string
  status: (typeof tagStatusEnum)[number]
}

export class TagToOutfitFactory implements TagToOutfit {
  constructor(seed: number | undefined, options: TagToOutfit | Omit<TagToOutfit, 'status'>) {
    faker.seed(seed)
    this.tagId = options.tagId
    this.outfitId = options.outfitId
    this.status =
      'status' in options
        ? options.status
        : (faker.helpers.arrayElement(tagStatusEnum) as (typeof tagStatusEnum)[number])
  }

  async store(name: string, port: number) {
    const db = instance(name, port)
    await db.insert(tagsToOutfits).values(this).onConflictDoNothing()
  }

  tagId: string
  outfitId: string
  status: (typeof tagStatusEnum)[number]
}
