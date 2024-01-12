import {relations, sql} from "drizzle-orm";
import {integer, sqliteTable, text, primaryKey} from 'drizzle-orm/sqlite-core';

export enum itemTypeEnum {
    'layer',
    'top',
    'bottom',
    'footwear',
    'accessory'
}

export const items = sqliteTable("items", {
    id: integer('id').primaryKey(),
    name: text('name'),
    brand: text('brand'),
    photo: text('photo'),
    type: integer('type').notNull(),
    rating: integer('rating').default(2),
    quality: integer('quality').default(2),
    timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`),
    authorUsername: text('author_username').notNull(),
});

export const itemsRelations = relations(items, ({many}) => ({
    itemsToOutfits: many(itemsToOutfits),
}));

export const outfits = sqliteTable("outfits", {
    id: integer('id').primaryKey(),
    rating: integer('rating').default(2),
    wearDate: text('wear_date').default(sql`CURRENT_DATE`),
    authorUsername: text('author_username').notNull(),
});

export const outfitsRelations = relations(outfits, ({many}) => ({
    itemsToOutfits: many(itemsToOutfits),
}));

export const tags = sqliteTable("tags", {
    id: integer('id').primaryKey(),
    name: text('name').notNull()
});

export const tagsToOutfits = sqliteTable("tags_to_outfits", {
    tagId: integer('tag_id').notNull().references(() => tags.id),
    outfitId: integer('outfit_id').notNull().references(() => outfits.id)
})


export const tagsToOutfitsRelations = relations(tagsToOutfits, ({one}) => ({
    tag: one(tags, {
        fields: [tagsToOutfits.tagId],
        references: [tags.id],
    }),
    outfit: one(outfits, {
        fields: [tagsToOutfits.outfitId],
        references: [outfits.id],
    }),
}));

export const itemsToOutfits = sqliteTable("items_to_outfits", {
    itemId: integer('item_id').notNull().references(() => items.id),
    outfitId: integer('outfit_id').notNull().references(() => outfits.id),
    type: integer('item_type').notNull(),
}, (table) => {
    return {
        pk: primaryKey(table.itemId, table.outfitId),
    };
});

export const itemsToOutfitsRelations = relations(itemsToOutfits, ({one}) => ({
    item: one(items, {
        fields: [itemsToOutfits.itemId],
        references: [items.id],
    }),
    outfit: one(outfits, {
        fields: [itemsToOutfits.outfitId],
        references: [outfits.id],
    }),
}));