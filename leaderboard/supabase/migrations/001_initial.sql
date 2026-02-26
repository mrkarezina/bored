CREATE TABLE games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  theme_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  play_count INTEGER DEFAULT 0
);

CREATE TABLE scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id),
  player_name TEXT NOT NULL CHECK (char_length(player_name) BETWEEN 1 AND 20),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 999999),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scores_game_id ON scores(game_id);
CREATE INDEX idx_scores_score_desc ON scores(score DESC);
CREATE INDEX idx_scores_game_score ON scores(game_id, score DESC);

-- Permissionless RLS: anyone can read and insert
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_games" ON games FOR SELECT USING (true);
CREATE POLICY "public_insert_games" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_games" ON games FOR UPDATE USING (true);
CREATE POLICY "public_read_scores" ON scores FOR SELECT USING (true);
CREATE POLICY "public_insert_scores" ON scores FOR INSERT WITH CHECK (true);

-- Helper function to atomically increment play count
CREATE OR REPLACE FUNCTION increment_play_count(game_id_input TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE games SET play_count = play_count + 1 WHERE id = game_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
