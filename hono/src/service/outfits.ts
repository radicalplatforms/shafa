import {Hono} from 'hono';
import {drizzle} from 'drizzle-orm/d1';
import {sql, and, eq, inArray} from "drizzle-orm";
import {createInsertSchema} from 'drizzle-zod';
import {zValidator} from "@hono/zod-validator";
import {z} from 'zod';

import {outfits, itemsToOutfits, itemTypeEnum} from "../schema";
import * as schema from "../schema";

type Bindings = {
    DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

const insertOutfitSchema = createInsertSchema(outfits, {
    rating: z.number().min(0).max(4)
}).extend({
    itemIdsTypes: z.array(
        z.object({
            id: z.number(),
            type: z.nativeEnum(itemTypeEnum)
        })
    ).max(8).optional()
}).omit({id: true, authorUsername: true});

const selectOutfitSchema = z.object({
    rating: z.coerce.number().min(0).max(4).optional(),
    "itemId[]": z.array(z.coerce.number()).optional()
});

app.get("/", async (c) => {
    const rating = c.req.query('rating') as number | undefined;
    const itemIds = c.req.queries('itemId[]') as number[] | [] || [];
    const db = drizzle(c.env.DB, {schema});
    return c.json(
        await db.query.outfits.findMany({
            with: {
                itemsToOutfits: {
                    columns: {
                        itemId: false,
                        outfitId: false
                    },
                    with: {
                        item: true
                    },
                    orderBy: (itemsToOutfits, {asc}) => [asc(itemsToOutfits.type)]
                }
            },
            orderBy: (outfits, {desc}) => [desc(outfits.wearDate)],
            where: and(
                itemIds.length > 0 ? inArray(outfits.id, (
                    await db.select()
                        .from(itemsToOutfits)
                        .where(inArray(itemsToOutfits.itemId, itemIds))
                        .groupBy(itemsToOutfits.outfitId)
                        .having(sql`count(distinct item_id) =
                        ${itemIds.length}`)
                        .all()
                ).map(e => e.outfitId)) : undefined,
                rating !== undefined ? eq(outfits.rating, rating) : undefined
            )
        })
    )
});

app.post("/", zValidator("json", insertOutfitSchema), async (c) => {
    const body = c.req.valid("json");
    const db = drizzle(c.env.DB);
    const author_username = "rak3rman";
    (body as any).authorUsername = author_username;

    const itemIdsTypes = body.itemIdsTypes
    delete body.itemIdsTypes

    const newOutfit = await db.insert(outfits).values(body).returning({id: outfits.id}).get();

    if (itemIdsTypes !== undefined) {
        await db.insert(itemsToOutfits).values(itemIdsTypes.map(e => ({
            itemId: e.id,
            outfitId: newOutfit.id,
            type: e.type
        }))).run();
    }

    return c.json(newOutfit)
});

app.put("/:id", zValidator("json", insertOutfitSchema), async (c) => {
    const id: number = +c.req.param('id');
    const body = c.req.valid("json");
    const db = drizzle(c.env.DB);
    const author_username = "rak3rman";
    (body as any).authorUsername = author_username;

    const itemIdsTypes = body.itemIdsTypes
    delete body.itemIdsTypes

    if (itemIdsTypes !== undefined) {
        await db.delete(itemsToOutfits).where(eq(itemsToOutfits.outfitId, id)).run();
        await db.insert(itemsToOutfits).values(itemIdsTypes.map(e => ({
            itemId: e.id,
            outfitId: id,
            type: e.type
        }))).run();
    }

    return c.json(
        await db.update(outfits).set(body).where(eq(outfits.id, id)).returning()
    )
});

app.delete("/:id", async (c) => {
    const id: number = +c.req.param('id');
    const db = drizzle(c.env.DB);

    await db.delete(itemsToOutfits).where(eq(itemsToOutfits.outfitId, id)).run();

    return c.json(
        await db.delete(outfits).where(eq(outfits.id, id)).returning()
    )
});

export default app