CREATE VIEW "items_extended" AS
SELECT "items"."id",
       "items"."name",
       "items"."brand",
       "items"."photo_url",
       "items"."type",
       "items"."rating",
       "items"."created_at",
       "items"."author_username",
       (SELECT "wear_date"
        FROM "outfits"
        WHERE "id" = (SELECT "outfit_id"
                      FROM "items_to_outfits"
                      WHERE "item_id" = "items"."id"
                      ORDER BY "outfit_id" DESC LIMIT 1)) AS "last_worn"
FROM "items";