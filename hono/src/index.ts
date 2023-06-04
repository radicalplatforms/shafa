import { Hono } from "hono";
export { Item } from "./item";
export { Outfit } from "./outfit";
export { User } from "./user";

type Bindings = {
  ITEM: DurableObjectNamespace;
  OUTFIT: DurableObjectNamespace;
  USER: DurableObjectNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("*", async (c) => {
  const id = c.env.ITEM.idFromName("A");
  const obj = c.env.ITEM.get(id);
  const resp = await obj.fetch(c.req.url);

  if (resp.status === 404) {
    return c.text("404 Not Found", 404);
  }

  const count = parseInt(await resp.text());
  return c.text(`Count is ${count}`);
});

export default app;