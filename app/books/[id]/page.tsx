'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BOOKS } from '@/lib/books-data';
import { BOOK_TAGS } from '@/lib/book-tags';
import { BookProgress } from '@/lib/db';
import StarRating from '@/components/StarRating';

type Status = 'unread' | 'reading' | 'read';

function nextStatus(s: Status): Status {
  if (s === 'unread') return 'reading';
  if (s === 'reading') return 'read';
  return 'unread';
}

function statusLabel(s: Status): string {
  if (s === 'unread') return 'Not Read';
  if (s === 'reading') return 'Currently Reading';
  return 'Read';
}

function statusNextLabel(s: Status): string {
  if (s === 'unread') return 'Start Reading';
  if (s === 'reading') return 'Mark as Read';
  return 'Mark as Unread';
}

function getSimilarBooks(bookId: number, count = 3) {
  const tags = BOOK_TAGS[bookId] ?? [];
  return BOOKS
    .filter(b => b.id !== bookId)
    .map(b => {
      const bTags = BOOK_TAGS[b.id] ?? [];
      const shared = tags.filter(t => bTags.includes(t)).length;
      return { book: b, shared };
    })
    .filter(x => x.shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, count)
    .map(x => x.book);
}

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();

  const book = BOOKS.find(b => b.id === parseInt(id));

  const [progress, setProgress] = useState<BookProgress | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [imgError, setImgError] = useState(false);

  const fetchProgress = useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch(`/api/books/${id}`);
      if (!res.ok) return;
      const data: BookProgress | null = await res.json();
      setProgress(data);
      setNoteText(data?.notes ?? '');
    } catch {}
  }, [id, session]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  if (!book) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="font-headline text-2xl text-[#121212] mb-4">Book not found</p>
          <Link href="/" className="font-ui-caps text-[#d0021b] underline">← Back to list</Link>
        </div>
      </div>
    );
  }

  const status: Status = progress?.status ?? 'unread';
  const rating = progress?.rating ?? null;
  const coverUrl = book.coverId ? `https://covers.openlibrary.org/b/id/${book.coverId}-L.jpg` : null;
  const similarBooks = getSimilarBooks(book.id);

  const handleSetStatus = async (newStatus: Status) => {
    if (!session?.user) return;
    const optimistic: BookProgress = {
      book_id: book.id,
      is_read: newStatus === 'read' ? 1 : 0,
      status: newStatus,
      rating: progress?.rating ?? null,
      read_date: newStatus === 'read' ? new Date().toISOString() : (progress?.read_date ?? null),
      notes: progress?.notes ?? null,
    };
    setProgress(optimistic);
    await fetch(`/api/books/${book.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  const handleRate = async (r: number) => {
    if (!session?.user) return;
    const optimistic: BookProgress = {
      book_id: book.id,
      is_read: 1,
      status: 'read',
      rating: r,
      read_date: progress?.read_date ?? new Date().toISOString(),
      notes: progress?.notes ?? null,
    };
    setProgress(optimistic);
    await fetch(`/api/books/${book.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'read', rating: r }),
    });
  };

  const handleNoteBlur = async () => {
    if (!session?.user) return;
    await fetch(`/api/books/${book.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: noteText }),
    });
    setProgress(prev => prev ? { ...prev, notes: noteText } : prev);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b-2 border-[#121212] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <span className="font-ui-caps text-[#d0021b] block text-xs">The New York Times</span>
            <button
              onClick={() => router.back()}
              className="font-ui-caps text-[#6b6b6b] hover:text-[#121212] transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
        <div className="h-0.5 bg-[#d0021b]" />
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Main layout: cover left, details right */}
        <div className="flex flex-col sm:flex-row gap-8 mb-12">
          {/* Cover */}
          <div className="flex-shrink-0">
            <div className="relative w-[160px] h-[240px] bg-[#f7f7f5] mx-auto sm:mx-0">
              {coverUrl && !imgError ? (
                <Image
                  src={coverUrl}
                  alt={`Cover of ${book.title}`}
                  fill
                  className="object-contain"
                  onError={() => setImgError(true)}
                  sizes="160px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center border border-[#e2e2e2]">
                  <span className="font-ui-caps text-[#6b6b6b] text-center px-2 leading-tight">{book.genre}</span>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className="font-ui-caps text-[#6b6b6b] border border-[#e2e2e2] px-2 py-0.5">#{book.rank}</span>
              <span className="font-ui-caps text-[#d0021b]">{book.genre}</span>
              <span className="font-ui-caps text-[#6b6b6b]">{book.year}</span>
            </div>

            {/* Title + Author */}
            <h1 className="font-headline text-3xl sm:text-4xl font-bold text-[#121212] leading-tight mb-2">
              {book.title}
            </h1>
            <p className="font-headline text-xl italic text-[#6b6b6b] mb-5">
              {book.author}
            </p>

            {/* Full description */}
            <p className="text-base text-[#333333] leading-relaxed mb-6" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
              {book.longDescription}
            </p>

            {/* Status control */}
            <div className="flex items-center gap-4 mb-5 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-ui-caps text-[#6b6b6b]">Status:</span>
                <span className={`font-ui-caps ${status === 'read' ? 'text-[#121212]' : status === 'reading' ? 'text-[#d0021b]' : 'text-[#6b6b6b]'}`}>
                  {statusLabel(status)}
                </span>
              </div>
              {session?.user ? (
                <button
                  onClick={() => handleSetStatus(nextStatus(status))}
                  className="font-ui-caps text-[#d0021b] border border-[#d0021b] px-3 py-1 hover:bg-[#d0021b] hover:text-white transition-colors"
                >
                  {statusNextLabel(status)}
                </button>
              ) : (
                <button
                  onClick={() => signIn('google')}
                  className="font-ui-caps text-[#6b6b6b] border border-[#e2e2e2] px-3 py-1 hover:border-[#121212] transition-colors"
                >
                  Log in to track
                </button>
              )}
            </div>

            {/* Rating — only when read */}
            {status === 'read' && session?.user && (
              <div className="mb-5">
                <StarRating rating={rating} onRate={handleRate} />
              </div>
            )}

            {/* Notes */}
            {session?.user && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-ui-caps text-[#6b6b6b]">Your Notes</span>
                  {noteSaved && <span className="font-ui-caps text-[#d0021b]" style={{ fontSize: '0.6rem' }}>Saved ✓</span>}
                </div>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onBlur={handleNoteBlur}
                  placeholder="Write your thoughts about this book..."
                  rows={4}
                  className="w-full border border-[#e2e2e2] p-3 text-sm text-[#333333] focus:outline-none focus:border-[#121212] resize-none placeholder-[#aaaaaa]"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Similar Books */}
        {similarBooks.length > 0 && (
          <div>
            <div className="border-t border-[#121212] pt-6 mb-6">
              <h2 className="font-headline text-2xl font-bold text-[#121212]">Similar Books on This List</h2>
              <div className="h-0.5 bg-[#e2e2e2] mt-2" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {similarBooks.map(similar => {
                const simCoverUrl = similar.coverId
                  ? `https://covers.openlibrary.org/b/id/${similar.coverId}-M.jpg`
                  : null;
                const sharedTags = (BOOK_TAGS[book.id] ?? []).filter(t => (BOOK_TAGS[similar.id] ?? []).includes(t));
                return (
                  <Link
                    key={similar.id}
                    href={`/books/${similar.id}`}
                    className="flex gap-3 group"
                  >
                    <div className="flex-shrink-0 relative w-[56px] h-[84px] bg-[#f7f7f5]">
                      {simCoverUrl ? (
                        <Image
                          src={simCoverUrl}
                          alt={`Cover of ${similar.title}`}
                          fill
                          className="object-contain"
                          sizes="56px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center border border-[#e2e2e2]">
                          <span className="font-ui-caps text-[#6b6b6b] text-center px-1 leading-tight" style={{ fontSize: '0.5rem' }}>{similar.genre}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-ui-caps text-[#6b6b6b] block mb-0.5">#{similar.rank}</span>
                      <h3 className="font-headline text-sm font-bold text-[#121212] leading-snug group-hover:text-[#d0021b] transition-colors line-clamp-2">
                        {similar.title}
                      </h3>
                      <p className="font-headline text-xs italic text-[#6b6b6b] mt-0.5">{similar.author}</p>
                      {sharedTags.length > 0 && (
                        <p className="font-ui-caps text-[#6b6b6b] mt-1" style={{ fontSize: '0.55rem' }}>
                          {sharedTags.slice(0, 2).map(t => t.replace(/-/g, ' ')).join(' · ')}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
