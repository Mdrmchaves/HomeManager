-- ============================================================
-- Run this SQL in Supabase SQL Editor to mark the
-- InitialBaseline EF migration as already applied.
--
-- This creates the EF migrations history table (if it doesn't
-- exist) and inserts the baseline record so that EF Core
-- knows the schema is already up to date.
--
-- After running this, `dotnet ef migrations list` should show:
--   20260310102006_InitialBaseline (Applied)
-- ============================================================

CREATE TABLE IF NOT EXISTS public."__EFMigrationsHistory" (
    "MigrationId"   character varying(150) NOT NULL,
    "ProductVersion" character varying(32)  NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

INSERT INTO public."__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260310102006_InitialBaseline', '9.0.4')
ON CONFLICT ("MigrationId") DO NOTHING;
