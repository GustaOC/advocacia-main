import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const key = process.env.SMS_BARATO_KEY;
  return NextResponse.json({ 
    hasKey: !!key, 
    keyPreview: key ? key.substring(0, 4) + '...' : null 
  });
}
