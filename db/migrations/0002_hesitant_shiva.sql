CREATE TYPE "public"."roundtable_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TYPE "public"."recipe_visibility" AS ENUM('private', 'public');--> statement-breakpoint
CREATE TABLE "recipe_stars" (
	"user_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_stars_user_id_recipe_id_pk" PRIMARY KEY("user_id","recipe_id")
);
--> statement-breakpoint
CREATE TABLE "roundtable_members" (
	"roundtable_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "roundtable_role" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roundtable_members_roundtable_id_user_id_pk" PRIMARY KEY("roundtable_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "roundtables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"invite_code" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roundtables_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "visibility" "recipe_visibility" DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe_stars" ADD CONSTRAINT "recipe_stars_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_stars" ADD CONSTRAINT "recipe_stars_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roundtable_members" ADD CONSTRAINT "roundtable_members_roundtable_id_roundtables_id_fk" FOREIGN KEY ("roundtable_id") REFERENCES "public"."roundtables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roundtable_members" ADD CONSTRAINT "roundtable_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roundtables" ADD CONSTRAINT "roundtables_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recipe_stars_recipe_idx" ON "recipe_stars" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "recipe_stars_user_idx" ON "recipe_stars" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "roundtable_members_user_idx" ON "roundtable_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "roundtables_owner_idx" ON "roundtables" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "recipes_visibility_idx" ON "recipes" USING btree ("visibility");