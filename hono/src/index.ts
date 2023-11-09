import { Hono } from "hono";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { version } from "../package.json";
import { drizzle } from 'drizzle-orm/d1';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { zValidator } from "@hono/zod-validator";
import { z } from 'zod';

import { item, outfit, item_to_outfit } from "./schema";

const insertItemSchema = createInsertSchema(item);
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

app.post("/api/items", zValidator("json", insertItemSchema), async (c) => {
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

export default app;