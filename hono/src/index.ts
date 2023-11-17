import {Hono} from "hono";
import {logger} from "hono/logger";
import {prettyJSON} from "hono/pretty-json";
import {version} from "../package.json";
import {drizzle} from 'drizzle-orm/d1';
import {sql, eq, asc, desc} from "drizzle-orm";
import {createInsertSchema, createSelectSchema} from 'drizzle-zod';
import {zValidator} from "@hono/zod-validator";
import {z} from 'zod';

import {items, outfits, itemsToOutfits, itemTypeEnum} from "./schema";
import * as schema from "./schema";

const insertItemSchema = createInsertSchema(items, {
    type: z.nativeEnum(itemTypeEnum),
    rating: z.number().min(0).max(4),
    quality: z.number().min(0).max(4)
});

const selectItemSchema = createSelectSchema(items);

const insertOutfitSchema = createInsertSchema(outfits, {
    rating: z.number().min(0).max(4)
}).extend({
    itemIdsTypes: z.array(
        z.object({
            id: z.number(),
            type: z.nativeEnum(itemTypeEnum)
        })
    ).max(8).optional()
}).omit({id: true});

const selectOutfitSchema = createSelectSchema(outfits).extend({
    itemIdsTypes: z.array(
        z.object({
            id: z.number(),
            type: z.nativeEnum(itemTypeEnum)
        })
    ).max(8).optional()
});

type Bindings = {
    DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", logger());
app.use("*", prettyJSON());

app.get("/", async (c) => {
    return c.text(`Shafa API v` + version);
});

app.get("/api/items", async (c) => {
    const type: number = Number(c.req.query('type') || -1);
    try {
        const db = drizzle(c.env.DB, {schema});
        return c.json(
            await db.query.items.findMany({
                where: type !== -1 ? eq(items.type, type) : undefined,
                extras: {
                    lastWorn: sql<string>`(SELECT wear_date FROM outfits WHERE id = (SELECT outfit_id FROM items_to_outfits WHERE item_id = items.id ORDER BY outfit_id DESC LIMIT 1))`.as("last_worn")
                },
                orderBy: [asc(sql.identifier('last_worn')), desc(items.rating), desc(items.quality)]
            })
        )
    } catch (e) {
        return c.json(e, 500)
    }
});

app.post("/api/items", zValidator("json", insertItemSchema.omit({id: true, timestamp: true})), async (c) => {
    const body = c.req.valid("json");
    try {
        const db = drizzle(c.env.DB);
        const results = await db.insert(items).values(body).returning().get();
        return c.json(results)
    } catch (e) {
        return c.json(e, 500)
    }
});

app.put("/api/items", zValidator("json", insertItemSchema.omit({timestamp: true})), async (c) => {
    const body = c.req.valid("json");
    try {
        const db = drizzle(c.env.DB);
        const results = await db.update(items).set(body).where(eq(items.id, body.id)).returning().get();
        return c.json(results)
    } catch (e) {
        return c.json(e, 500)
    }
});

app.get("/api/outfits", async (c) => {
    try {
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
                        orderBy: (itemsToOutfits, {asc}) => [asc(itemsToOutfits.type)],
                    }
                },
                orderBy: (outfits, {desc}) => [desc(outfits.wearDate)]
            })
        )
    } catch (e) {
        return c.json(e, 500)
    }
});

app.post("/api/outfits", zValidator("json", insertOutfitSchema), async (c) => {
    const body = c.req.valid("json");
    try {
        const db = drizzle(c.env.DB);

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
    } catch (e) {
        return c.json(e, 500)
    }
});

app.put("/api/outfits/:id", zValidator("json", insertOutfitSchema), async (c) => {
    const id: number = +c.req.param('id');
    const body = c.req.valid("json");
    try {
        const db = drizzle(c.env.DB);

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
    } catch (e) {
        return c.json(e, 500)
    }
});

app.delete("/api/outfits/:id", async (c) => {
    const id: number = +c.req.param('id');
    try {
        const db = drizzle(c.env.DB);

        await db.delete(itemsToOutfits).where(eq(itemsToOutfits.outfitId, id)).run();

        return c.json(
            await db.delete(outfits).where(eq(outfits.id, id)).returning()
        )
    } catch (e) {
        return c.json(e, 500)
    }
});

export default app;