'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Book } from '@/lib/books-data';
import StarRating from './StarRating';

type Status = 'unread' | 'reading' | 'read';

interface BookCardProps {
  book: Book;
  status: Status;
  rating: number | null;
  onSetStatus: (bookId: number, status: Status) => void;
  onRate: (bookId: number, rating: number) => void;
}

function nextStatus(s: Status): Status {
  if (s === 'unread') return 'reading';
  if (s === 'reading') return 'read';
  return 'unread';
}

function statusButtonLabel(s: Status): string {
  if (s === 'unread') return 'Start Reading';
  if (s === 'reading') return 'Mark as Read';
  return 'Mark as Unread';
}

export default function BookCard({ book, status, rating, onSetStatus, onRate }: BookCardProps) {
  const [imgError, setImgError] = useState(false);
  const router = useRouter();
  const coverUrl = book.coverId
    ? `https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`
    : null;

  return (
    <article
      onClick={() => router.push(`/books/${book.id}`)}
      className={`flex gap-4 py-4 border-b border-[#e2e2e2] transition-colors cursor-pointer ${
        status !== 'unread' ? 'bg-[#f7f7f5]' : 'bg-white hover:bg-[#f7f7f5]'
      }`}
      style={{ paddingLeft: '0', paddingRight: '0' }}
    >
      {/* Cover image */}
      <div className="flex-shrink-0 w-[72px] relative">
        <span className="font-ui-caps text-[#6b6b6b] block mb-1 text-center">#{book.rank}</span>
        <div className="relative w-[72px] h-[108px] bg-[#f7f7f5]">
          {coverUrl && !imgError ? (
            <Image
              src={coverUrl}
              alt={`Cover of ${book.title}`}
              fill
              className="object-contain"
              onError={() => setImgError(true)}
              sizes="72px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#f7f7f5] border border-[#e2e2e2]">
              <span className="font-ui-caps text-[#6b6b6b] text-center px-1 leading-tight">{book.genre}</span>
            </div>
          )}
          {/* Status badge on cover */}
          {status === 'read' && (
            <div className="absolute top-0 right-0 w-4 h-4 bg-[#d0021b] flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {status === 'reading' && (
            <div className="absolute top-0 right-0 bg-[#d0021b] px-1 py-0.5">
              <span className="font-ui-caps text-white" style={{ fontSize: '0.5rem', letterSpacing: '0.05em' }}>READING</span>
            </div>
          )}
        </div>
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="font-ui-caps text-[#d0021b]">{book.genre}</span>
        <h3 className="font-headline text-base font-bold text-[#121212] leading-snug line-clamp-2">
          {book.title}
        </h3>
        <p className="font-headline text-sm italic text-[#6b6b6b]">
          {book.author}, {book.year}
        </p>

        {/* Description with hover tooltip */}
        <div className="relative group/desc mt-0.5">
          <p className="text-sm text-[#333333] leading-relaxed line-clamp-3" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
            {book.description}
          </p>
          <div className="pointer-events-none absolute bottom-full left-0 right-0 mb-2 z-50 hidden group-hover/desc:block">
            <div className="bg-white border border-[#121212] p-3 text-sm text-[#333333] leading-relaxed shadow-none" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
              {book.description}
            </div>
          </div>
        </div>

        {/* Rating — only when read */}
        {status === 'read' && (
          <StarRating rating={rating} onRate={(r) => { onRate(book.id, r); }} />
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 mt-1">
          <button
            onClick={(e) => { e.stopPropagation(); onSetStatus(book.id, nextStatus(status)); }}
            className="font-ui text-xs underline underline-offset-2 transition-colors text-[#121212] hover:text-[#d0021b]"
          >
            {statusButtonLabel(status)}
          </button>
          <a
            href={`https://www.amazon.com/s?k=${encodeURIComponent(book.title + ' ' + book.author)}&i=stripbooks`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-ui text-xs underline underline-offset-2 text-[#6b6b6b] hover:text-[#d0021b] transition-colors"
          >
            Find on Amazon
          </a>
        </div>
      </div>
    </article>
  );
}
