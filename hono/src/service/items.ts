import { zValidator } from '@hono/zod-validator';
import { sql, and, eq, asc, desc, like, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { Hono } from 'hono';
import { z } from 'zod';

import { items, itemsToOutfits, itemTypeEnum } from '../schema';
import * as schema from '../schema';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

const insertItemSchema = createInsertSchema(items, {
  type: z.nativeEnum(itemTypeEnum),
  rating: z.number().min(0).max(4),
  quality: z.number().min(0).max(4),
}).omit({ authorUsername: true });

const selectItemSchema = createSelectSchema(items);

app.get('/', async (c) => {
  const type: number = Number(c.req.query('type') || -1);
  const search: string = c.req.query('search') || '';
  const db = drizzle(c.env.DB, { schema });
  return c.json(
    await db.query.items.findMany({
      where: and(
        type !== -1 ? eq(items.type, type) : undefined,
        search !== ''
          ? or(
              like(items.name, `%${search}%`),
              like(items.brand, `%${search}%`),
            )
          : undefined,
      ),
      extras: {
        lastWorn: sql<string>`(SELECT wear_date
                                       FROM outfits
                                       WHERE id = (SELECT outfit_id
                                                   FROM items_to_outfits
                                                   WHERE item_id = items.id
                                                   ORDER BY outfit_id DESC LIMIT 1)
                                      )`.as('last_worn'),
        rollingMonthWears: sql<number>`(SELECT COUNT(DISTINCT (wear_date))
                                                FROM outfits
                                                WHERE id IN (SELECT outfit_id FROM items_to_outfits WHERE item_id = items.id)
                                                  AND wear_date >= date ('now'
                                                    , '-1 month')
                                               )`.as('rolling_month_wears'),
        rollingYearWears: sql<number>`(SELECT COUNT(DISTINCT (wear_date))
                                               FROM outfits
                                               WHERE id IN (SELECT outfit_id FROM items_to_outfits WHERE item_id = items.id)
                                                 AND wear_date >= date ('now'
                                                   , '-1 year')
                                              )`.as('rolling_year_wears'),
      },
      orderBy: [
        asc(sql.identifier('last_worn')),
        desc(items.rating),
        desc(items.quality),
      ],
    }),
  );
});

app.post(
  '/',
  zValidator('json', insertItemSchema.omit({ id: true, timestamp: true })),
  async (c) => {
    const body = c.req.valid('json');
    const db = drizzle(c.env.DB);
    const author_username = 'rak3rman';
    (body as any).authorUsername = author_username;
    return c.json(await db.insert(items).values(body).returning());
  },
);

app.put(
  '/:id',
  zValidator('json', insertItemSchema.omit({ timestamp: true })),
  async (c) => {
    const id: number = +c.req.param('id');
    const body = c.req.valid('json');
    const author_username = 'rak3rman';
    (body as any).authorUsername = author_username;
    const db = drizzle(c.env.DB);
    return c.json(
      await db.update(items).set(body).where(eq(items.id, id)).returning(),
    );
  },
);

app.delete('/:id', async (c) => {
  const id: number = +c.req.param('id');
  const db = drizzle(c.env.DB);

  await db.delete(itemsToOutfits).where(eq(itemsToOutfits.itemId, id)).run();

  return c.json(await db.delete(items).where(eq(items.id, id)).returning());
});

export default app;
