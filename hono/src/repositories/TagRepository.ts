import { and, eq } from 'drizzle-orm'

import { tag } from '../schema'
import type { DBVariables } from '../utils/inject-db'

export class TagRepository {
  constructor(private db: DBVariables['db']) {}

  async findAll(userId: string) {
    return this.db.query.tag.findMany({
      where: eq(tag.userId, userId),
      orderBy: (tags, { asc }) => [asc(tag.name)],
    })
  }

  async create(userId: string, data: any) {
    return (
      await this.db
        .insert(tag)
        .values({
          ...data,
          userId,
        })
        .returning()
    )[0]
  }

  async update(userId: string, tagId: string, data: any) {
    return (
      await this.db
        .update(tag)
        .set({
          ...data,
          userId,
        })
        .where(eq(tag.id, tagId))
        .returning()
    )[0]
  }

  async delete(userId: string, tagId: string) {
    return (
      await this.db
        .delete(tag)
        .where(and(eq(tag.id, tagId), eq(tag.userId, userId)))
        .returning()
    )[0]
  }
}
