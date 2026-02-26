import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

const MAX_HTML_SIZE = 500 * 1024; // 500KB
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 10;

const uploadRateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = uploadRateLimitMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
  uploadRateLimitMap.set(ip, recent);

  if (recent.length >= RATE_LIMIT_MAX) {
    return true;
  }

  recent.push(now);
  uploadRateLimitMap.set(ip, recent);

  // Clean up old entries
  if (uploadRateLimitMap.size > 10000) {
    for (const [key, ts] of uploadRateLimitMap) {
      const filtered = ts.filter((t) => now - t < RATE_LIMIT_WINDOW);
      if (filtered.length === 0) {
        uploadRateLimitMap.delete(key);
      } else {
        uploadRateLimitMap.set(key, filtered);
      }
    }
  }

  return false;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 10 uploads per hour.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { gameId, html } = body;

    if (!gameId || typeof gameId !== 'string' || !UUID_REGEX.test(gameId)) {
      return NextResponse.json(
        { error: 'gameId must be a valid UUID v4' },
        { status: 400 }
      );
    }

    if (!html || typeof html !== 'string') {
      return NextResponse.json(
        { error: 'html must be a non-empty string' },
        { status: 400 }
      );
    }

    if (html.length > MAX_HTML_SIZE) {
      return NextResponse.json(
        { error: `HTML content exceeds maximum size of ${MAX_HTML_SIZE / 1024}KB` },
        { status: 400 }
      );
    }

    // Sanity check: looks like a bored runner game
    if (!html.includes('THEME') || !html.includes('<canvas')) {
      return NextResponse.json(
        { error: 'HTML does not appear to be a valid bored runner game (missing THEME or <canvas)' },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('games')
      .upload(`${gameId}.html`, html, {
        contentType: 'text/html',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload game' },
        { status: 500 }
      );
    }

    // Extract game name from THEME if possible
    const nameMatch = html.match(/name:\s*['"]([^'"]+)['"]/);
    const descMatch = html.match(/description:\s*['"]([^'"]+)['"]/);
    const gameName = nameMatch?.[1] || 'Untitled Game';
    const themeDescription = descMatch?.[1] || null;

    // Upsert game metadata
    const { error: gameError } = await supabase
      .from('games')
      .upsert({
        id: gameId,
        name: gameName,
        theme_description: themeDescription,
      }, { onConflict: 'id' });

    if (gameError) {
      console.error('Game upsert error:', gameError);
    }

    const playUrl = `https://bored.run/play/${gameId}`;

    return NextResponse.json({ url: playUrl });
  } catch (e) {
    console.error('Upload error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
