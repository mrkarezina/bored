ALTER TABLE games ADD COLUMN IF NOT EXISTS all_time_high INTEGER DEFAULT 0;

-- Backfill from existing scores
UPDATE games SET all_time_high = COALESCE((
  SELECT MAX(score) FROM scores WHERE scores.game_id = games.id
), 0);
