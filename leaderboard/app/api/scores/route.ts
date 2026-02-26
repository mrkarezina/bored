import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Rate limit map: key = `playerName:gameId`, value = last submit timestamp
const rateLimitMap = new Map<string, number>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameId, gameName, theme, playerName, score } = body;

    if (!gameId || !playerName || score === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (typeof playerName !== 'string' || playerName.length < 1 || playerName.length > 20) {
      return NextResponse.json({ error: 'Player name must be 1-20 characters' }, { status: 400 });
    }

    if (typeof score !== 'number' || score < 0 || score > 999999 || !Number.isInteger(score)) {
      return NextResponse.json({ error: 'Score must be an integer 0-999999' }, { status: 400 });
    }

    // Rate limit: same playerName+gameId once per 5 seconds
    const rateLimitKey = `${playerName}:${gameId}`;
    const lastSubmit = rateLimitMap.get(rateLimitKey);
    const now = Date.now();
    if (lastSubmit && now - lastSubmit < 5000) {
      return NextResponse.json({ error: 'Too many submissions. Wait a few seconds.' }, { status: 429 });
    }
    rateLimitMap.set(rateLimitKey, now);

    // Clean up old rate limit entries periodically
    if (rateLimitMap.size > 10000) {
      const cutoff = now - 10000;
      for (const [key, ts] of rateLimitMap) {
        if (ts < cutoff) rateLimitMap.delete(key);
      }
    }

    // Upsert game entry
    const { error: gameError } = await supabase
      .from('games')
      .upsert({
        id: gameId,
        name: gameName || 'Untitled Game',
        theme_description: theme || null,
      }, { onConflict: 'id' });

    if (gameError) {
      console.error('Game upsert error:', gameError);
    }

    // Increment play count
    try {
      await supabase.rpc('increment_play_count', { game_id_input: gameId });
    } catch {
      // RPC may not exist — ignore
    }

    // Insert score
    const { error: scoreError } = await supabase
      .from('scores')
      .insert({
        game_id: gameId,
        player_name: playerName,
        score: score,
      });

    if (scoreError) {
      console.error('Score insert error:', scoreError);
      return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
    }

    // Get rank for this game
    const { data: rankData } = await supabase
      .from('scores')
      .select('score')
      .eq('game_id', gameId)
      .gt('score', score);

    const rank = (rankData?.length ?? 0) + 1;

    // Get top 10 for this game
    const { data: leaderboard } = await supabase
      .from('scores')
      .select('player_name, score, created_at')
      .eq('game_id', gameId)
      .order('score', { ascending: false })
      .limit(10);

    return NextResponse.json({ rank, leaderboard: leaderboard || [] });
  } catch (e) {
    console.error('Score submission error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
  const global = searchParams.get('global');

  try {
    if (global === 'true') {
      // Global leaderboard across all games
      const { data, error } = await supabase
        .from('scores')
        .select(`
          player_name,
          score,
          created_at,
          game_id,
          games!inner(name)
        `)
        .order('score', { ascending: false })
        .limit(limit);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const leaderboard = (data || []).map((row: Record<string, unknown>) => ({
        playerName: row.player_name,
        score: row.score,
        createdAt: row.created_at,
        gameId: row.game_id,
        gameName: (row.games as Record<string, unknown>)?.name || 'Unknown',
      }));

      return NextResponse.json({ leaderboard });
    }

    if (!gameId) {
      return NextResponse.json({ error: 'gameId or global=true required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('scores')
      .select('player_name, score, created_at')
      .eq('game_id', gameId)
      .order('score', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const leaderboard = (data || []).map((row: Record<string, unknown>) => ({
      playerName: row.player_name,
      score: row.score,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ leaderboard });
  } catch (e) {
    console.error('Leaderboard fetch error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
