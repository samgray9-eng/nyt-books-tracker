import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { upsertProgress } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const bookId = parseInt(id);
    const { is_read, rating } = await request.json();
    await upsertProgress(session.user.id, bookId, is_read, rating);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}
