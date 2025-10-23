CREATE TYPE "public"."reasoningEffort" AS ENUM('minimal', 'low', 'medium', 'high');--> statement-breakpoint
CREATE TABLE "agent_chat" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_message" text NOT NULL,
	"agent_response" text NOT NULL,
	"summary" text,
	"reasoning_effort" "reasoningEffort",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
COMMENT ON TABLE "agent_chat" IS 'Table of agent chats representing user interactions with the AI fashion stylist agent.';--> statement-breakpoint
COMMENT ON COLUMN "agent_chat"."id" IS 'The unique identifier of the entity.';--> statement-breakpoint
COMMENT ON COLUMN "agent_chat"."user_id" IS 'The ID of the user associated with the entity.';--> statement-breakpoint
COMMENT ON COLUMN "agent_chat"."user_message" IS 'The message sent by the user to the agent.';--> statement-breakpoint
COMMENT ON COLUMN "agent_chat"."agent_response" IS 'The JSON stringified response from the agent.';--> statement-breakpoint
COMMENT ON COLUMN "agent_chat"."summary" IS 'The 4-10 word summary of the user prompt.';--> statement-breakpoint
COMMENT ON COLUMN "agent_chat"."reasoning_effort" IS 'The expected reasoning effort level for processing the request.';--> statement-breakpoint
COMMENT ON COLUMN "agent_chat"."created_at" IS 'The timestamp when the entity was created.';
--> statement-breakpoint
ALTER TABLE "item_tag" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "item_tag" CASCADE;--> statement-breakpoint
ALTER TABLE "tag" DROP CONSTRAINT "min_days_before_item_reuse";--> statement-breakpoint
ALTER TABLE "item" DROP COLUMN "photo_url";--> statement-breakpoint
ALTER TABLE "item" DROP COLUMN "rating";--> statement-breakpoint
ALTER TABLE "tag" DROP COLUMN "min_days_before_item_reuse";