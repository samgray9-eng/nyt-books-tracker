'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Book } from '@/lib/books-data';
import StarRating from './StarRating';

const GENRE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Literary Fiction': { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500/30' },
  'Historical Fiction': { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' },
  'Science Fiction': { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/30' },
  'Fantasy': { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' },
  'Memoir': { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/30' },
  'Nonfiction': { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/30' },
  'Short Stories': { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/30' },
  'Horror': { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30' },
  'Young Adult': { bg: 'bg-teal-500/20', text: 'text-teal-300', border: 'border-teal-500/30' },
  'Romance': { bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-500/30' },
};

interface BookCardProps {
  book: Book;
  isRead: boolean;
  rating: number | null;
  onToggleRead: (bookId: number, isRead: boolean) => void;
  onRate: (bookId: number, rating: number) => void;
}

export default function BookCard({ book, isRead, rating, onToggleRead, onRate }: BookCardProps) {
  const [imgError, setImgError] = useState(false);
  const genreStyle = GENRE_COLORS[book.genre] ?? { bg: 'bg-gray-500/20', text: 'text-gray-300', border: 'border-gray-500/30' };
  const coverUrl = book.coverId
    ? `https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`
    : null;

  return (
    <div
      className={`
        relative flex flex-col rounded-xl overflow-hidden border backdrop-blur-sm
        transition-all duration-200 hover:scale-[1.02] hover:shadow-xl
        ${isRead
          ? 'border-emerald-500/40 bg-gray-800/70 shadow-emerald-500/10 shadow-lg'
          : 'border-gray-700/50 bg-gray-800/50 hover:border-gray-600/70'
        }
      `}
    >
      {/* Read overlay indicator */}
      {isRead && (
        <div className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Cover image area */}
      <div className="relative w-full h-48 bg-gray-900/50 overflow-hidden flex-shrink-0">
        {/* Rank badge */}
        <div className="absolute top-2 left-2 z-10 bg-gray-900/80 border border-gray-600/50 rounded-md px-2 py-0.5 text-xs font-bold text-gray-200 backdrop-blur-sm">
          #{book.rank}
        </div>

        {coverUrl && !imgError ? (
          <Image
            src={coverUrl}
            alt={`Cover of ${book.title}`}
            fill
            className="object-contain"
            onError={() => setImgError(true)}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className={`w-full h-full flex flex-col items-center justify-center ${genreStyle.bg} p-4`}>
            <div className="text-4xl mb-2">📚</div>
            <span className={`text-xs font-medium text-center ${genreStyle.text}`}>{book.genre}</span>
          </div>
        )}

        {/* Green tint overlay when read */}
        {isRead && (
          <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none" />
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Genre badge */}
        <div>
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${genreStyle.bg} ${genreStyle.text} ${genreStyle.border}`}>
            {book.genre}
          </span>
        </div>

        {/* Title & Author */}
        <div>
          <h3 className="font-bold text-white text-sm leading-snug line-clamp-2 mb-1">
            {book.title}
          </h3>
          <p className="text-gray-400 text-xs">
            {book.author} &middot; {book.year}
          </p>
        </div>

        {/* Description */}
        <div className="relative flex-1 group/desc">
          <p className="text-gray-500 text-xs leading-relaxed line-clamp-3">
            {book.description}
          </p>
          <div className="pointer-events-none absolute bottom-full left-0 right-0 mb-2 z-50 hidden group-hover/desc:block">
            <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 text-gray-300 text-xs leading-relaxed shadow-xl">
              {book.description}
            </div>
          </div>
        </div>

        {/* Rating (only when read) */}
        {isRead && (
          <StarRating
            rating={rating}
            onRate={(r) => onRate(book.id, r)}
          />
        )}

        {/* Amazon link */}
        <a
          href={`https://www.amazon.com/s?k=${encodeURIComponent(book.title + ' ' + book.author)}&i=stripbooks`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2 px-3 rounded-lg text-xs font-semibold border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-500/50 transition-all duration-150 text-center"
        >
          Buy on Amazon
        </a>

        {/* Toggle button */}
        <button
          onClick={() => onToggleRead(book.id, !isRead)}
          className={`
            mt-auto w-full py-2 px-3 rounded-lg text-xs font-semibold border transition-all duration-150
            ${isRead
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-500/50'
            }
          `}
        >
          {isRead ? '✓ Mark as Unread' : '+ Mark as Read'}
        </button>
      </div>
    </div>
  );
}
