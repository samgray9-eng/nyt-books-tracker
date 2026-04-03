import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOneProgress, upsertProgress } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const progress = await getOneProgress(session.user.id, parseInt(id));
  return NextResponse.json(progress ?? null);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const bookId = parseInt(id);
    const body = await request.json();

    // Support both new `status` field and legacy `is_read` boolean
    let status: 'unread' | 'reading' | 'read';
    if (body.status) {
      status = body.status;
    } else if (body.is_read !== undefined) {
      status = body.is_read ? 'read' : 'unread';
    } else {
      // Notes-only update — fetch current status
      const current = await getOneProgress(session.user.id, bookId);
      status = current?.status ?? 'unread';
    }

    await upsertProgress(session.user.id, bookId, status, body.rating, body.notes);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}
