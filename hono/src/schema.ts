import { createId } from '@paralleldrive/cuid2'
import { relations, sql } from 'drizzle-orm'
import {
  check,
  date,
  doublePrecision,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

/**
 * Item Type Enumeration
 */
export const itemTypeEnum: [string, ...string[]] = [
  'layer',
  'top',
  'bottom',
  'footwear',
  'accessory',
]
export const itemTypeEnumPg = pgEnum('itemType', itemTypeEnum)

/**
 * Item Status Enumeration
 */
export const itemStatusEnum: [string, ...string[]] = ['available', 'withheld', 'retired']
export const itemStatusEnumPg = pgEnum('itemStatus', itemStatusEnum)

/**
 * Item
 */
export const item = pgTable('item', {
  id: text('id')
    .$defaultFn(() => createId())
    .primaryKey(),
  name: text('name').notNull(),
  brand: text('brand'),
  type: itemTypeEnumPg('type').notNull(),
  status: itemStatusEnumPg('status').notNull().default('available'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  userId: text('user_id').notNull(),
})

export const itemRelations = relations(item, ({ many }) => ({
  outfitItems: many(outfitItem),
}))

/**
 * Outfit
 */
export const outfit = pgTable(
  'outfit',
  {
    id: text('id')
      .$defaultFn(() => createId())
      .primaryKey(),
    rating: smallint('rating').notNull(),
    wearDate: date('wear_date', { mode: 'date' }),
    locationLatitude: doublePrecision('location_latitude'),
    locationLongitude: doublePrecision('location_longitude'),
    userId: text('user_id').notNull(),
  },
  (table) => [check('rating_check', sql`${table.rating} >= 0 AND ${table.rating} <= 2`)]
)

export const outfitRelations = relations(outfit, ({ many }) => ({
  outfitItems: many(outfitItem),
  outfitTags: many(outfitTag),
}))

/**
 * Outfit Item
 */
export const outfitItem = pgTable(
  'outfit_item',
  {
    outfitId: text('outfit_id')
      .notNull()
      .references(() => outfit.id, { onDelete: 'cascade' }),
    itemId: text('item_id')
      .notNull()
      .references(() => item.id, { onDelete: 'cascade' }),
    itemType: itemTypeEnumPg('item_type').notNull(),
  },
  (table) => [primaryKey({ columns: [table.outfitId, table.itemId] })]
)

export const outfitItemRelations = relations(outfitItem, ({ one }) => ({
  outfit: one(outfit, {
    fields: [outfitItem.outfitId],
    references: [outfit.id],
  }),
  item: one(item, {
    fields: [outfitItem.itemId],
    references: [item.id],
  }),
}))

/**
 * Tag Status Enumeration
 */
export const tagStatusEnum: [string, ...string[]] = [
  'manually_assigned',
  'suggested',
  'suggestion_accepted',
  'suggestion_rejected',
]
export const tagStatusEnumPg = pgEnum('tagStatus', tagStatusEnum)

/**
 * Tag
 */
export const tag = pgTable('tag', {
  id: text('id')
    .$defaultFn(() => createId())
    .primaryKey(),
  name: text('name').notNull(),
  hexColor: text('hex_color').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  userId: text('user_id').notNull(),
})

export const tagRelations = relations(tag, ({ many }) => ({
  outfitTags: many(outfitTag),
}))

/**
 * Outfit Tag
 */
export const outfitTag = pgTable(
  'outfit_tag',
  {
    outfitId: text('outfit_id')
      .notNull()
      .references(() => outfit.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
    status: tagStatusEnumPg('status').notNull().default('suggested'),
  },
  (table) => [primaryKey({ columns: [table.outfitId, table.tagId] })]
)

export const outfitTagRelations = relations(outfitTag, ({ one }) => ({
  outfit: one(outfit, {
    fields: [outfitTag.outfitId],
    references: [outfit.id],
  }),
  tag: one(tag, {
    fields: [outfitTag.tagId],
    references: [tag.id],
  }),
}))

/**
 * Reasoning Effort Enumeration
 */
export const reasoningEffortEnum: [string, ...string[]] = ['minimal', 'low', 'medium', 'high']
export const reasoningEffortEnumPg = pgEnum('reasoningEffort', reasoningEffortEnum)

/**
 * Agent Conversation
 */
export const agentConversation = pgTable('agent_conversation', {
  id: text('id')
    .$defaultFn(() => createId())
    .primaryKey(),
  userId: text('user_id').notNull(),
  state: jsonb('state').notNull().$type<{
    messages: any[]
    context: {
      userId: string
      conversationId?: string
      recentItems?: string[]
      recentOutfits?: string[]
      lastIntent?: string
    }
  }>(),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
