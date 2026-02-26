import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

// Rate limit map: key = `ip:gameId`, value = last submit timestamp
const rateLimitMap = new Map<string, number>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameId, gameName, theme, score } = body;

    if (!gameId || score === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (typeof score !== 'number' || score < 0 || score > 999999 || !Number.isInteger(score)) {
      return NextResponse.json({ error: 'Score must be an integer 0-999999' }, { status: 400 });
    }

    // Rate limit: same ip+gameId once per 5 seconds
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimitKey = `${ip}:${gameId}`;
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

    // Update all_time_high if this score beats it
    const { data: gameData } = await supabase
      .from('games')
      .select('play_count, all_time_high')
      .eq('id', gameId)
      .single();

    const currentHigh = gameData?.all_time_high ?? 0;
    const playCount = gameData?.play_count ?? 1;
    const isNewRecord = score > currentHigh;

    if (isNewRecord) {
      await supabase
        .from('games')
        .update({ all_time_high: score })
        .eq('id', gameId);
    }

    return NextResponse.json({
      playCount,
      allTimeHigh: isNewRecord ? score : currentHigh,
      isNewRecord,
    });
  } catch (e) {
    console.error('Score submission error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');

  if (!gameId) {
    return NextResponse.json({ error: 'gameId required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('games')
      .select('play_count, all_time_high')
      .eq('id', gameId)
      .single();

    if (error) {
      return NextResponse.json({ playCount: 0, allTimeHigh: 0 });
    }

    return NextResponse.json({
      playCount: data?.play_count ?? 0,
      allTimeHigh: data?.all_time_high ?? 0,
    });
  } catch (e) {
    console.error('Stats fetch error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
