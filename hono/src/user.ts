import { Hono } from "hono";

export class User {
  items: string[] = []; // Items, Durable Object IDs pointing to all Items owned by this user
  outfits: string[] = []; // Outfits, Durable Object IDs pointing to all Items owned by this user
  brands: string[] = []; // Brands, String literal of all brands used by this user

  state: DurableObjectState;
  app: Hono = new Hono();

  constructor(state: DurableObjectState) {
    this.state = state;
    this.state.blockConcurrencyWhile(async () => {
      this.items = (await this.state.storage?.get<string[]>("items")) || [];
      this.outfits = (await this.state.storage?.get<string[]>("outfits")) || [];
      this.brands = (await this.state.storage?.get<string[]>("brands")) || [];
    });

    this.app.get("/", async (c) => {
      return c.json({
        items: this.items,
        outfits: this.outfits,
        brands: this.brands,
      });
    });
  }

  async fetch(request: Request) {
    return this.app.fetch(request);
  }
}