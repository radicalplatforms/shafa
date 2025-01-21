UPDATE "outfits" SET "rating" = 
  CASE 
    WHEN "rating" = 2 THEN 1 
    WHEN "rating" >= 3 THEN 2
    ELSE 0
  END;

ALTER TABLE "outfits" ADD CONSTRAINT "rating_check" CHECK ("outfits"."rating" >= 0 AND "outfits"."rating" <= 2);