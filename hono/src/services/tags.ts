import { zValidator } from '@hono/zod-validator'
import { isCuid } from '@paralleldrive/cuid2'
import { and, eq } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { Hono } from 'hono'
import { z } from 'zod'

import type { outfits} from '../schema';
import { tags } from '../schema'
import { requireAuth } from '../utils/auth'
import type { AuthVariables } from '../utils/auth'
import type { DBVariables } from '../utils/inject-db'
import injectDB from '../utils/inject-db'

const insertTagSchema = createInsertSchema(tags, {
  name: z.string().min(1).max(60),
  hexColor: z.string().regex(/^#[0-9A-F]{6}$/i),
  minDaysBeforeItemReuse: z.number().min(-1).max(365).default(-1),
}).omit({ id: true, createdAt: true, userId: true })

const selectTagSchema = createSelectSchema(tags, {
  id: z.string().refine((val) => isCuid(val)),
})

// Virtual tag type definition
export type VirtualTag = {
  id: string
  name: string
  hexColor: string
  minDaysBeforeItemReuse: number
  createdAt: Date
  userId: string
  appliesTo?: (outfit: typeof outfits.$inferSelect) => boolean // Function to determine if this tag applies to an outfit
}

// Define virtual tags registry
export const VIRTUAL_TAGS: Record<string, VirtualTag> = {
  // Idea tag - for outfits with null wear dates (ghost outfits)
  idea_tag: {
    id: 'idea_tag',
    name: 'Idea',
    hexColor: '#9CA3AF', // Gray color
    minDaysBeforeItemReuse: -1,
    createdAt: new Date(),
    userId: 'system',
    appliesTo: (outfit) => outfit.wearDate === null,
  },
}

// Helper function to check if a tag ID is virtual
export const isVirtualTag = (tagId: string): boolean => {
  return Object.keys(VIRTUAL_TAGS).includes(tagId)
}

// Helper function to get virtual tags that apply to an outfit
export const getApplicableVirtualTags = (outfit: typeof outfits.$inferSelect): VirtualTag[] => {
  return Object.values(VIRTUAL_TAGS).filter((tag) => tag.appliesTo && tag.appliesTo(outfit))
}

const app = new Hono<{ Variables: AuthVariables & DBVariables }>()
  .get('/', requireAuth, injectDB, async (c) => {
    const auth = c.get('auth')
    const userId = auth?.userId || ''

    const tagsData = await c.get('db').query.tags.findMany({
      where: eq(tags.userId, userId),
      orderBy: (tags, { asc }) => [asc(tags.name)],
    })

    // Add all virtual tags at the beginning of the tags list
    return c.json([...Object.values(VIRTUAL_TAGS), ...tagsData])
  })
  .post('/', zValidator('json', insertTagSchema), requireAuth, injectDB, async (c) => {
    const auth = c.get('auth')
    const userId = auth?.userId || ''
    const body = c.req.valid('json')

    // Don't allow creating a tag with a reserved virtual tag name
    if (Object.values(VIRTUAL_TAGS).some((tag) => tag.name === body.name)) {
      return c.json({ message: `Cannot create a tag with the reserved name "${body.name}"` }, 400)
    }

    return c.json(
      (
        await c
          .get('db')
          .insert(tags)
          .values({
            ...body,
            userId,
          })
          .returning()
      )[0]
    )
  })
  .put(
    '/:id',
    zValidator('param', selectTagSchema.pick({ id: true })),
    zValidator('json', insertTagSchema),
    requireAuth,
    injectDB,
    async (c) => {
      const auth = c.get('auth')
      const userId = auth?.userId || ''
      const params = c.req.valid('param')
      const body = c.req.valid('json')

      // Don't allow updating a virtual tag
      if (isVirtualTag(params.id)) {
        return c.json({ message: 'Cannot update a virtual tag' }, 400)
      }

      return c.json(
        (
          await c
            .get('db')
            .update(tags)
            .set({
              ...body,
              userId,
            })
            .where(eq(tags.id, params.id))
            .returning()
        )[0]
      )
    }
  )
  .delete(
    '/:id',
    zValidator('param', selectTagSchema.pick({ id: true })),
    requireAuth,
    injectDB,
    async (c) => {
      const auth = c.get('auth')
      const userId = auth?.userId || ''
      const params = c.req.valid('param')

      // Don't allow deleting a virtual tag
      if (isVirtualTag(params.id)) {
        return c.json({ message: 'Cannot delete a virtual tag' }, 400)
      }

      return c.json(
        (
          await c
            .get('db')
            .delete(tags)
            .where(and(eq(tags.id, params.id), eq(tags.userId, userId)))
            .returning()
        )[0]
      )
    }
  )

export default app
