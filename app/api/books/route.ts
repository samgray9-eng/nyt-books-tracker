import { NextResponse } from 'next/server';
import { getAllProgress } from '@/lib/db';

export async function GET() {
  try {
    const progress = await getAllProgress();
    return NextResponse.json(progress);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
}
