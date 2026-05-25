-- Enable citext for case-insensitive text comparison
CREATE EXTENSION IF NOT EXISTS citext;

-- Drop constraints/indexes before type conversion to avoid rebuild failures.
-- These are re-added below after the type change.
-- Handles both standard constraint form and functional index form left by prior migrations.
-- ALTER TABLE "City" DROP CONSTRAINT IF EXISTS "City_name_key";
-- DROP INDEX IF EXISTS "City_name_key";
-- ALTER TABLE "ClimateAction" DROP CONSTRAINT IF EXISTS "ClimateAction_cityId_title_key";
-- DROP INDEX IF EXISTS "ClimateAction_cityId_title_key";

-- Convert to citext (case-insensitive comparisons and sorts)
ALTER TABLE "City" ALTER COLUMN "name" TYPE citext;
ALTER TABLE "ClimateAction" ALTER COLUMN "title" TYPE citext;

-- Recreate constraints on citext columns — now case-insensitive
ALTER TABLE "City" ADD CONSTRAINT "City_name_key" UNIQUE ("name");
ALTER TABLE "ClimateAction" ADD CONSTRAINT "ClimateAction_cityId_title_key" UNIQUE ("cityId", "title");