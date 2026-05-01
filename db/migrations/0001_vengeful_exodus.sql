CREATE TYPE "public"."media_kind" AS ENUM('image', 'video', 'embed');--> statement-breakpoint
CREATE TYPE "public"."media_provider" AS ENUM('youtube', 'vimeo');--> statement-breakpoint
CREATE TABLE "recipe_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"step_id" uuid,
	"kind" "media_kind" NOT NULL,
	"url" text NOT NULL,
	"poster_url" text,
	"caption" text,
	"ordinal" integer DEFAULT 0 NOT NULL,
	"mime_type" text,
	"size_bytes" integer,
	"width" integer,
	"height" integer,
	"duration_seconds" numeric(8, 2),
	"provider" "media_provider",
	"embed_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "cover_image_url" text;--> statement-breakpoint
ALTER TABLE "recipe_media" ADD CONSTRAINT "recipe_media_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_media" ADD CONSTRAINT "recipe_media_step_id_recipe_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."recipe_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recipe_media_recipe_idx" ON "recipe_media" USING btree ("recipe_id","ordinal");--> statement-breakpoint
CREATE INDEX "recipe_media_step_idx" ON "recipe_media" USING btree ("step_id");