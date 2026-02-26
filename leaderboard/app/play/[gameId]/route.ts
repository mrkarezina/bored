import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  if (!gameId || !UUID_REGEX.test(gameId)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from('games')
    .download(`${gameId}.html`);

  if (error || !data) {
    return new NextResponse('Game not found', { status: 404 });
  }

  const html = await data.text();

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
