import { createId } from '@paralleldrive/cuid2'
import { relations, sql } from 'drizzle-orm'
import {
  check,
  date,
  doublePrecision,
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
 * Items
 */
export const items = pgTable('items', {
  id: text('id')
    .$defaultFn(() => createId())
    .primaryKey(),
  name: text('name').notNull(),
  brand: text('brand'),
  photoUrl: text('photo_url'),
  type: itemTypeEnumPg('type').notNull(),
  rating: smallint('rating').notNull(),
  status: itemStatusEnumPg('status').notNull().default('available'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  userId: text('user_id').notNull(),
})

export const itemsRelations = relations(items, ({ many }) => ({
  itemsToOutfits: many(itemsToOutfits),
  tagsToItems: many(tagsToItems),
}))

/**
 * Outfits
 */
export const outfits = pgTable(
  'outfits',
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
  (table) => ({
    ratingCheck: check('rating_check', sql`${table.rating} >= 0 AND ${table.rating} <= 2`),
  })
)

export const outfitsRelations = relations(outfits, ({ many }) => ({
  itemsToOutfits: many(itemsToOutfits),
  tagsToOutfits: many(tagsToOutfits),
}))

/**
 * Items to Outfits
 */
export const itemsToOutfits = pgTable(
  'items_to_outfits',
  {
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    outfitId: text('outfit_id')
      .notNull()
      .references(() => outfits.id, { onDelete: 'cascade' }),
    itemType: itemTypeEnumPg('item_type').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.itemId, table.outfitId] }),
    }
  }
)

export const itemsToOutfitsRelations = relations(itemsToOutfits, ({ one }) => ({
  item: one(items, {
    fields: [itemsToOutfits.itemId],
    references: [items.id],
  }),
  outfit: one(outfits, {
    fields: [itemsToOutfits.outfitId],
    references: [outfits.id],
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
 * Tags
 */
export const tags = pgTable(
  'tags',
  {
    id: text('id')
      .$defaultFn(() => createId())
      .primaryKey(),
    name: text('name').notNull(),
    hexColor: text('hex_color').notNull(),
    minDaysBeforeItemReuse: smallint('min_days_before_item_reuse').notNull().default(-1),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    userId: text('user_id').notNull(),
  },
  (table) => ({
    minDaysCheck: check('min_days_before_item_reuse', sql`${table.minDaysBeforeItemReuse} >= -1`),
  })
)

export const tagsRelations = relations(tags, ({ many }) => ({
  tagsToOutfits: many(tagsToOutfits),
  tagsToItems: many(tagsToItems),
}))

/**
 * Tags to Outfits
 */
export const tagsToOutfits = pgTable(
  'tags_to_outfits',
  {
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    outfitId: text('outfit_id')
      .notNull()
      .references(() => outfits.id, { onDelete: 'cascade' }),
    status: tagStatusEnumPg('status').notNull().default('suggested'),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.tagId, table.outfitId] }),
    }
  }
)

export const tagsToOutfitsRelations = relations(tagsToOutfits, ({ one }) => ({
  tag: one(tags, {
    fields: [tagsToOutfits.tagId],
    references: [tags.id],
  }),
  outfit: one(outfits, {
    fields: [tagsToOutfits.outfitId],
    references: [outfits.id],
  }),
}))

/**
 * Tags to Items
 */
export const tagsToItems = pgTable(
  'tags_to_items',
  {
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    status: tagStatusEnumPg('status').notNull().default('suggested'),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.tagId, table.itemId] }),
    }
  }
)

export const tagsToItemsRelations = relations(tagsToItems, ({ one }) => ({
  tag: one(tags, {
    fields: [tagsToItems.tagId],
    references: [tags.id],
  }),
  item: one(items, {
    fields: [tagsToItems.itemId],
    references: [items.id],
  }),
}))
