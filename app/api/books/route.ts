import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAllProgress } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([]);
  try {
    const progress = await getAllProgress(session.user.id);
    return NextResponse.json(progress);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
}
