import { createId } from '@paralleldrive/cuid2'
import { relations } from 'drizzle-orm'
import { date, pgEnum, pgTable, primaryKey, smallint, text, timestamp } from 'drizzle-orm/pg-core'

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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  authorUsername: text('author_username').notNull(),
})

export const itemsRelations = relations(items, ({ many }) => ({
  itemsToOutfits: many(itemsToOutfits),
}))

/**
 * Outfits
 */
export const outfits = pgTable('outfits', {
  id: text('id')
    .$defaultFn(() => createId())
    .primaryKey(),
  rating: smallint('rating').notNull(),
  wearDate: date('wear_date').notNull().defaultNow(),
  authorUsername: text('author_username').notNull(),
})

export const outfitsRelations = relations(outfits, ({ many }) => ({
  itemsToOutfits: many(itemsToOutfits),
}))

/**
 * Items to Outfits
 */
export const itemsToOutfits = pgTable(
  'items_to_outfits',
  {
    itemId: text('item_id')
      .notNull()
      .references(() => items.id),
    outfitId: text('outfit_id')
      .notNull()
      .references(() => outfits.id),
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
