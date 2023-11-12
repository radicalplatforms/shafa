import { Hono } from "hono";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { version } from "../package.json";
import { drizzle } from 'drizzle-orm/d1';
import { eq } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { zValidator } from "@hono/zod-validator";
import { z } from 'zod';

import { items, outfits, itemsToOutfits, itemTypeEnum } from "./schema";
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
});

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
  try {
    const db = drizzle(c.env.DB);
    const query = db.select().from(items);
    const results = await query.all();
    return c.json(results)
  } catch (e) {
    return c.json({err: e}, 500)
  }
});

app.post("/api/items", zValidator("json", insertItemSchema.omit({id: true, timestamp: true})), async (c) => {
    const body = c.req.valid("json");
    try {
        const db = drizzle(c.env.DB);
        const results = await db.insert(items).values(body).returning().get();
        return c.json(results)
    } catch (e) {
        return c.json({err: e}, 500)
    }
});

app.put("/api/items", zValidator("json", insertItemSchema.omit({timestamp: true})), async (c) => {
    const body = c.req.valid("json");
    try {
        const db = drizzle(c.env.DB);
        const results = await db.update(items).set(body).where(eq(items.id, body.id)).returning().get();
        return c.json(results)
    } catch (e) {
        return c.json({err: e}, 500)
    }
});

app.get("/api/outfits", async (c) => {
    try {
        const db = drizzle(c.env.DB, { schema });

        const results = await db.query.outfits.findMany({
            with: {
                itemsToOutfits: {
                    columns: {
                        itemId: false,
                        outfitId: false
                    },
                    with: {
                        item: true
                    }
                }
            }
        })

        return c.json(results)
    } catch (e) {
        console.log(e);
        return c.json({err: e}, 500)
    }
});

app.post("/api/outfits", zValidator("json", insertOutfitSchema.omit({id: true})), async (c) => {
    const body = c.req.valid("json");
    try {
        const db = drizzle(c.env.DB);

        const itemIdsTypes = body.itemIdsTypes
        delete body.itemIdsTypes

        const { id: newOutfitId } = await db.insert(outfits).values(body).returning({ id: outfits.id }).get();

        if (itemIdsTypes !== undefined) {
            await db.insert(itemsToOutfits).values(itemIdsTypes.map(e => ({
                itemId: e.id,
                outfitId: newOutfitId,
                type: e.type
            }))).run();
        }

        return c.json("WIP")
    } catch (e) {
        return c.json({err: e}, 500)
    }
});

app.put("/api/outfits", zValidator("json", insertOutfitSchema), async (c) => {
    const body = c.req.valid("json");
    try {
        const db = drizzle(c.env.DB);
        const results = await db.update(outfits).set(body).where(eq(outfits.id, body.id)).returning().get();
        return c.json(results)
    } catch (e) {
        return c.json({err: e}, 500)
    }
});

export default app;