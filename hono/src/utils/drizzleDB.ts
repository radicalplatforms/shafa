import { drizzle } from 'drizzle-orm/d1';
import type { Context } from 'hono';
import * as schema from '../schema';

const drizzleDB = async (c: Context, next: Function) => {
  const db = drizzle(c.env.DB, { schema });
  c.set('db', db);
  await next();
};

export default drizzleDB;
