-- Photos on bags and brews (Beanconqueror-parity feature).
-- Each row stores a single downscaled JPEG inline as a data URL (see
-- src/lib/photo/resize.ts). No Storage bucket: the photo rides the existing
-- row upsert as an ordinary text column, so sync/backup/export need no changes.
--
-- Columns are camelCase-quoted to match the rest of the schema (weightGrams,
-- dialedRecipe, waterTempC, …). Additive + nullable — safe on populated tables.
-- Idempotent: re-running is a no-op.

alter table public.bags  add column if not exists "photo" text;
alter table public.brews add column if not exists "photo" text;
