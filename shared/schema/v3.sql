-- RaBit schema v3 (applied after v2). Mirrors MIGRATIONS[2] in src/db/migrations.ts.
-- Savings jars can have a deadline (ISO date) that is also a Calendar event (event_id points at events.id).
PRAGMA user_version = 3;
ALTER TABLE savings_goals ADD COLUMN deadline TEXT;
ALTER TABLE savings_goals ADD COLUMN event_id TEXT;
