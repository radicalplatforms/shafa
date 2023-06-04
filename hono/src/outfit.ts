import { Hono } from "hono";

export class Outfit {
  layer: string | undefined; // Layer, Durable Object ID pointing to an Item
  top: string | undefined; // Top, Durable Object ID pointing to an Item
  bottom: string | undefined; // Bottom, Durable Object ID pointing to an Item
  footwear: string | undefined; // Footwear, Durable Object ID pointing to an Item
  accessories: string[] = []; // Accessories, Durable Object IDs pointing to Items
  rating: number = 2; // Rating, 0-4, likability of item
  wear_date: Date = new Date(); // Wear Date, Date of when outfit was worn

  state: DurableObjectState;
  app: Hono = new Hono();

  constructor(state: DurableObjectState) {
    this.state = state;
    this.state.blockConcurrencyWhile(async () => {
      this.layer =
        (await this.state.storage?.get<string>("layer")) || undefined;
      this.top = (await this.state.storage?.get<string>("top")) || undefined;
      this.bottom =
        (await this.state.storage?.get<string>("bottom")) || undefined;
      this.footwear =
        (await this.state.storage?.get<string>("footwear")) || undefined;
      this.accessories =
        (await this.state.storage?.get<string[]>("accessories")) || [];
      this.rating = (await this.state.storage?.get<number>("rating")) || 2;
      this.wear_date =
        (await this.state.storage?.get<Date>("wear_date")) || new Date();
    });

    this.app.get("/", async (c) => {
      return c.json({
        layer: this.layer,
        top: this.top,
        bottom: this.bottom,
        footwear: this.footwear,
        accessories: this.accessories,
        rating: this.rating,
        wear_date: this.wear_date,
      });
    });
  }

  async fetch(request: Request) {
    return this.app.fetch(request);
  }
}