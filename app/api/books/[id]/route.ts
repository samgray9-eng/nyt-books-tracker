import { NextRequest, NextResponse } from 'next/server';
import { upsertProgress } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookId = parseInt(id);
    const body = await request.json();
    const { is_read, rating } = body;

    await upsertProgress(bookId, is_read, rating);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}
