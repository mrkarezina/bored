import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sort = searchParams.get('sort') || 'popular';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

  try {
    let query = supabase
      .from('games')
      .select('id, name, theme_description, created_at, play_count');

    if (sort === 'recent') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('play_count', { ascending: false });
    }

    const { data, error } = await query.limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // For each game, get the top score
    const games = await Promise.all(
      (data || []).map(async (game: Record<string, unknown>) => {
        const { data: topScore } = await supabase
          .from('scores')
          .select('player_name, score')
          .eq('game_id', game.id)
          .order('score', { ascending: false })
          .limit(1)
          .single();

        return {
          id: game.id,
          name: game.name,
          theme: game.theme_description,
          createdAt: game.created_at,
          playCount: game.play_count,
          topScore: topScore ? { playerName: topScore.player_name, score: topScore.score } : null,
        };
      })
    );

    return NextResponse.json({ games });
  } catch (e) {
    console.error('Games fetch error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
