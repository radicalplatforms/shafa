/*
 * Shafa Hono.js Backend
 *
 * Wildhacks Demo Project, April 2023
 *
 * Radison Akerman, Leeza Andryushchenko
 * Richard Yang, Sengdao Inthavong
 */

import { Hono } from "hono";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import * as jose from "jose";
import { Bindings } from "hono/dist/types/types";
import faunadb from "faunadb";

const faunaClient = new faunadb.Client({
  secret: "fnAFBYEXE-AAUG-ngNcv0DP_Qs36eKVqCi3zBrLc",
});
const { Call, Function, Paginate, Match, Index, Lambda, Get, Var, Map } =
  faunadb.query;

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", logger());
app.use("*", prettyJSON());

app.get("/", (c) => c.text("Shafa API v1.0.0"));

// Retrieve all items in items collection
app.get("/items", async (c) => {
  try {
    const { data } = await faunaClient.query(
      Map(Paginate(Match(Index("allItems"))), Lambda("X", Get(Var("X"))))
    );
    return c.json(data);
  } catch (error) {
    console.error(error);
    return c.text("Error occurred");
  }
});

// Add a new item to the items collection
app.post("/createItem", async (c) => {
  try {
    // Convert the request body to a JSON object
    const body = await c.req.json();
    console.log(body);
    const result = await faunaClient.query(
      Call(
        Function("addNewItem"),
        body.user_id,
        body.uuid,
        body.desc,
        body.brand,
        body.photo,
        body.primaryColor,
        body.pattern,
        body.type,
        body.subtype,
        body.style,
        body.rating,
        body.quality
      )
    );
    return c.json(result);
  } catch (error) {
    return c.json(error);
  }
});

export default app;