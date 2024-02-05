import { zValidator } from '@hono/zod-validator';
import { sql, and, eq, inArray } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { type Context, Hono } from 'hono';
import { z } from 'zod';

import { outfits, itemsToOutfits, itemTypeEnum } from '../schema';
import drizzleDB from '../utils/drizzleDB';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

const insertOutfitSchema = createInsertSchema(outfits, {
  rating: z.number().min(0).max(4),
  authorUsername: z.string().optional(),
})
  .extend({
    itemIdsTypes: z
      .array(
        z.object({
          id: z.number(),
          type: z.nativeEnum(itemTypeEnum),
        }),
      )
      .max(8)
      .optional(),
  })
  .omit({ id: true });

app.use('*', drizzleDB);

app.get('/', async (c: Context) => {
  const rating = c.req.query('rating') as number | undefined;
  const itemIds = (c.req.queries('itemId[]') as number[] | []) || [];

  return c.json(
    await c.get('db').query.outfits.findMany({
      with: {
        itemsToOutfits: {
          columns: {
            itemId: false,
            outfitId: false,
          },
          with: {
            item: true,
          },
          orderBy: (itemsToOutfits, { asc }) => [asc(itemsToOutfits.type)],
        },
      },
      orderBy: (outfits, { desc }) => [desc(outfits.wearDate)],
      where: and(
        itemIds.length > 0
          ? inArray(
              outfits.id,
              (
                await c
                  .get('db')
                  .select()
                  .from(itemsToOutfits)
                  .where(inArray(itemsToOutfits.itemId, itemIds))
                  .groupBy(itemsToOutfits.outfitId)
                  .having(
                    sql`count(distinct item_id) =
                                    ${itemIds.length}`,
                  )
                  .all()
              ).map((e) => e.outfitId),
            )
          : undefined,
        rating !== undefined ? eq(outfits.rating, rating) : undefined,
      ),
    }),
  );
});

app.post('/', zValidator('json', insertOutfitSchema), async (c: Context) => {
  const body = c.req.valid('json');
  body.authorUsername = 'rak3rman'; // TODO: remove and replace with author integration

  const itemIdsTypes = body.itemIdsTypes;
  delete body.itemIdsTypes;

  const newOutfit = await c
    .get('db')
    .insert(outfits)
    .values(body)
    .returning({ id: outfits.id })
    .get();

  if (itemIdsTypes !== undefined) {
    await c
      .get('db')
      .insert(itemsToOutfits)
      .values(
        itemIdsTypes.map((e) => ({
          itemId: e.id,
          outfitId: newOutfit.id,
          type: e.type,
        })),
      )
      .run();
  }

  return c.json(newOutfit);
});

app.put('/:id', zValidator('json', insertOutfitSchema), async (c: Context) => {
  const id: number = +c.req.param('id');

  const body = c.req.valid('json');
  body.authorUsername = 'rak3rman'; // TODO: remove and replace with author integration

  const itemIdsTypes = body.itemIdsTypes;
  delete body.itemIdsTypes;

  if (itemIdsTypes !== undefined) {
    await c
      .get('db')
      .delete(itemsToOutfits)
      .where(eq(itemsToOutfits.outfitId, id))
      .run();
    await c
      .get('db')
      .insert(itemsToOutfits)
      .values(
        itemIdsTypes.map((e) => ({
          itemId: e.id,
          outfitId: id,
          type: e.type,
        })),
      )
      .run();
  }

  return c.json(
    await c
      .get('db')
      .update(outfits)
      .set(body)
      .where(eq(outfits.id, id))
      .returning(),
  );
});

app.delete('/:id', async (c: Context) => {
  const id: number = +c.req.param('id');

  await c
    .get('db')
    .delete(itemsToOutfits)
    .where(eq(itemsToOutfits.outfitId, id))
    .run();

  return c.json(
    await c.get('db').delete(outfits).where(eq(outfits.id, id)).returning(),
  );
});

export default app;
