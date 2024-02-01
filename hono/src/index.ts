import {Hono} from "hono";

import items from './service/items'
import outfits from './service/outfits'

import {logger} from "hono/logger";
import {prettyJSON} from "hono/pretty-json";
import {version} from "../package.json";

const app = new Hono();

app.onError((err, c) => {
    console.error(`${err}`)
    return c.text('Internal Service Error', 500)
})

app.use("*", logger());
app.use("*", prettyJSON());

app.get("/", async (c) => {
    return c.text(`Shafa API v` + version);
});

const routes = app.route("/api/items", items).route("/api/outfits", outfits)

export default app;
export type AppType = typeof routes