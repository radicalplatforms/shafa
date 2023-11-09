import { Hono } from "hono";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { version } from "../package.json";
import { drizzle } from 'drizzle-orm/d1';
import { eq } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { zValidator } from "@hono/zod-validator";
import { z } from 'zod';

import { item, outfit, item_to_outfit, itemTypeEnum } from "./schema";

const insertItemSchema = createInsertSchema(item, {
    type: z.nativeEnum(itemTypeEnum),
    rating: z.number().min(0).max(4),
    quality: z.number().min(0).max(4)
});
const selectItemSchema = createSelectSchema(item);

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
    const query = db.select().from(item);
    const results = await query.all();
    return c.json(results)
  } catch (e) {
    return c.json({err: e}, 500)
  }
});

app.post("/api/items", zValidator("json", insertItemSchema.omit({id: true, timestamp: true})), async (c) => {
    const body = c.req.valid("json");
    console.log(body);
    try {
        const db = drizzle(c.env.DB);
        const results = await db.insert(item).values(body).returning().get();
        return c.json(results)
    } catch (e) {
        return c.json({err: e}, 500)
    }
});

app.put("/api/items", zValidator("json", insertItemSchema.omit({timestamp: true})), async (c) => {
    const body = c.req.valid("json");
    console.log(body);
    try {
        const db = drizzle(c.env.DB);
        const results = await db.update(item).set(body).where(eq(item.id, body.id)).returning().get();
        return c.json(results)
    } catch (e) {
        return c.json({err: e}, 500)
    }
});

export default app;