import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';

export enum itemTypeEnum {
    'layer',
    'top',
    'bottom',
    'footwear',
    'accessory'
}

export const item = sqliteTable("item", {
    id: integer('id').primaryKey(),
    name: text('name'),
    brand: text('brand'),
    photo: text('photo'),
    type: integer('type').notNull(),
    rating: integer('rating').default(2),
    quality: integer('quality').default(2),
    timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`)
});

export const outfit = sqliteTable("outfit", {
    id: integer('id').primaryKey(),
    rating: integer('rating').default(2),
    wearDate: text('wear_date').default(sql`CURRENT_DATE`)
});

export const item_to_outfit = sqliteTable("item_to_outfit", {
    itemId: integer('item_id').references(() => item.id),
    outfitId: integer('outfit_id').references(() => outfit.id),
    type: integer('item_type').notNull(),
}, (table) => {
    return {
        pk: primaryKey(table.itemId, table.outfitId),
    };
});