import { Hono } from "hono";

export class Item {
  name: string = ""; // Name, String literal of name of item
  brand: string = ""; // Brand, String literal of brand of item, should match a brand in User.brands
  photo: string = ""; // Photo, String literal of CF Images ID of item
  type: string = ""; // Type, String literal of type of item (layer, top, bottom, footwear, accessory)
  rating: number = 2; // Rating, 0-4, likability of item
  quality: number = 2; // Quality, 0-4, quality of item
  created_date: Date = new Date(); // Created Date, Date of when item was created

  state: DurableObjectState;
  app: Hono = new Hono();

  constructor(state: DurableObjectState) {
    this.state = state;
    this.state.blockConcurrencyWhile(async () => {
      this.name = (await this.state.storage?.get<string>("name")) || "";
      this.brand = (await this.state.storage?.get<string>("brand")) || "";
      this.photo = (await this.state.storage?.get<string>("photo")) || "";
      this.type = (await this.state.storage?.get<string>("type")) || "";
      this.rating = (await this.state.storage?.get<number>("rating")) || 2;
      this.quality = (await this.state.storage?.get<number>("quality")) || 2;
      this.created_date =
        (await this.state.storage?.get<Date>("created_date")) || new Date();
    });

    this.app.get("/", async (c) => {
      return c.json({
        name: this.name,
        brand: this.brand,
        photo: this.photo,
        type: this.type,
        rating: this.rating,
        quality: this.quality,
        created_date: this.created_date,
      });
    });
  }

  async fetch(request: Request) {
    return this.app.fetch(request);
  }
}