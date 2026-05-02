CREATE TYPE "public"."agentRole" AS ENUM('system', 'user', 'assistant', 'tool');--> statement-breakpoint
CREATE TYPE "public"."finishReason" AS ENUM('stop', 'length', 'tool_calls', 'content_filter', 'error', 'other');--> statement-breakpoint
CREATE TABLE "agent_conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text,
	"system_prompt" text,
	"model" text NOT NULL,
	"leaf_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "agent_message" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"parent_id" text,
	"role" "agentRole" NOT NULL,
	"parts" jsonb NOT NULL,
	"metadata" jsonb,
	"model" text NOT NULL,
	"usage" jsonb,
	"finish_reason" "finishReason" NOT NULL,
	"error" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "agent_chat" CASCADE;--> statement-breakpoint
ALTER TABLE "agent_message" ADD CONSTRAINT "agent_message_conversation_id_agent_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."agent_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_message" ADD CONSTRAINT "agent_message_parent_id_agent_message_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."agent_message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_conversation" ADD CONSTRAINT "agent_conversation_leaf_message_id_agent_message_id_fk" FOREIGN KEY ("leaf_message_id") REFERENCES "public"."agent_message"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_message_conversation_idx" ON "agent_message" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "agent_message_parent_idx" ON "agent_message" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "agent_message_convo_created_idx" ON "agent_message" USING btree ("conversation_id","created_at");--> statement-breakpoint
DROP TYPE "public"."reasoningEffort";--> statement-breakpoint
COMMENT ON TABLE "agent_conversation" IS 'Table of agent conversations representing chat sessions between users and the AI agent.';--> statement-breakpoint
COMMENT ON COLUMN "agent_conversation"."id" IS 'The unique identifier of the entity.';--> statement-breakpoint
COMMENT ON COLUMN "agent_conversation"."user_id" IS 'The ID of the user who created the entity.';--> statement-breakpoint
COMMENT ON COLUMN "agent_conversation"."title" IS 'The title of the entity.';--> statement-breakpoint
COMMENT ON COLUMN "agent_conversation"."system_prompt" IS 'The system prompt used to configure the agent behavior for this conversation.';--> statement-breakpoint
COMMENT ON COLUMN "agent_conversation"."model" IS 'The AI model identifier used for generating responses in this conversation.';--> statement-breakpoint
COMMENT ON COLUMN "agent_conversation"."leaf_message_id" IS 'The ID of the leaf message in the active conversation path. The full path is reconstructed by walking up parent_id references from this message to the root.';--> statement-breakpoint
COMMENT ON COLUMN "agent_conversation"."created_at" IS 'The timestamp when the entity was created.';--> statement-breakpoint
COMMENT ON COLUMN "agent_conversation"."updated_at" IS 'The timestamp when the entity was last meaningfully updated.';--> statement-breakpoint
COMMENT ON COLUMN "agent_conversation"."archived_at" IS 'The timestamp when the entity was archived.';--> statement-breakpoint
COMMENT ON TABLE "agent_message" IS 'Table of agent messages representing individual messages within conversations.';--> statement-breakpoint
COMMENT ON COLUMN "agent_message"."id" IS 'The unique identifier of the entity.';--> statement-breakpoint
COMMENT ON COLUMN "agent_message"."conversation_id" IS 'The ID of the agent conversation associated with the entity.';--> statement-breakpoint
COMMENT ON COLUMN "agent_message"."parent_id" IS 'The ID of the parent message this entity derives from.';--> statement-breakpoint
COMMENT ON COLUMN "agent_message"."role" IS 'The role of the entity.';--> statement-breakpoint
COMMENT ON COLUMN "agent_message"."parts" IS 'The UIMessage parts array containing the message content, such as text blocks, tool calls, and other structured content parts.';--> statement-breakpoint
COMMENT ON COLUMN "agent_message"."metadata" IS 'Optional UIMessage metadata providing additional context or custom data associated with the message.';--> statement-breakpoint
COMMENT ON COLUMN "agent_message"."model" IS 'The AI model identifier used to generate this specific message response.';--> statement-breakpoint
COMMENT ON COLUMN "agent_message"."usage" IS 'Token usage and accounting information for this message, including prompt and completion token counts.';--> statement-breakpoint
COMMENT ON COLUMN "agent_message"."finish_reason" IS 'The reason the model stopped generating the entity. Values include stop (normal completion), length (max tokens reached), tool_calls (stopped to call tools), content_filter (content filtered), error (error occurred), or other (catch-all).';--> statement-breakpoint
COMMENT ON COLUMN "agent_message"."error" IS 'Error information if the message generation failed, including error type and message details.';--> statement-breakpoint
COMMENT ON COLUMN "agent_message"."created_at" IS 'The timestamp when the entity was created.';
