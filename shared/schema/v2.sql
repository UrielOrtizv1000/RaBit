-- RaBit schema v2 (applied after v1). Mirrors MIGRATIONS[1] in src/db/migrations.ts.
-- Savings: goals ("jars") and their deposits/withdrawals. Money is REAL in the user's currency.
PRAGMA user_version = 2;

-- freq: 'none' (just a goal) | 'week' | 'month'. n = planned periods, start = absolute period index
-- (week = Mondays counted from 2000-01-03; month = year*12 + month0).
CREATE TABLE savings_goals (id TEXT PRIMARY KEY, name TEXT NOT NULL, target REAL NOT NULL, saved REAL NOT NULL DEFAULT 0, color TEXT NOT NULL, freq TEXT NOT NULL DEFAULT 'none', n INTEGER NOT NULL DEFAULT 0, start INTEGER NOT NULL DEFAULT 0, important INTEGER NOT NULL DEFAULT 0);
-- amt > 0 deposit, amt < 0 withdrawal; moved_at is epoch ms.
CREATE TABLE savings_moves (id TEXT PRIMARY KEY, goal_id TEXT NOT NULL, amt REAL NOT NULL, moved_at INTEGER NOT NULL);
CREATE INDEX idx_savings_moves_goal ON savings_moves(goal_id);
