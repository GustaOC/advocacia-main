import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }
  const key = process.env.SMS_BARATO_KEY;
  return NextResponse.json({ 
    hasKey: !!key, 
    keyPreview: key ? key.substring(0, 4) + '...' : null 
  });
}
