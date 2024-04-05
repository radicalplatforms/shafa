CREATE VIEW "items_extended" AS
SELECT "items"."id",
       "items"."name",
       "items"."brand",
       "items"."photo_url",
       "items"."type",
       "items"."rating",
       "items"."created_at",
       "outfits"."wear_date" AS "last_worn"
FROM "items"
       JOIN
     "items_to_outfits" ON "items"."id" = "items_to_outfits"."item_id"
       JOIN
     "outfits" ON "outfits"."id" = "items_to_outfits"."outfit_id"
ORDER BY "outfits"."wear_date" DESC LIMIT 1;