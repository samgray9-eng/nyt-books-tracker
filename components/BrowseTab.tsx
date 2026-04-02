'use client';

import { useState, useMemo } from 'react';
import { Book } from '@/lib/books-data';
import { BookProgress } from '@/lib/db';
import BookCard from './BookCard';

const ALL_GENRES = [
  'Literary Fiction', 'Historical Fiction', 'Science Fiction', 'Fantasy',
  'Memoir', 'Nonfiction', 'Short Stories', 'Horror', 'Young Adult', 'Romance',
];

interface BrowseTabProps {
  books: Book[];
  progressMap: Record<number, BookProgress>;
  onToggleRead: (bookId: number, isRead: boolean) => void;
  onRate: (bookId: number, rating: number) => void;
}

export default function BrowseTab({ books, progressMap, onToggleRead, onRate }: BrowseTabProps) {
  const [search, setSearch] = useState('');
  const [readFilter, setReadFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [genreFilter, setGenreFilter] = useState('all');

  const filtered = useMemo(() => {
    return books.filter((book) => {
      const progress = progressMap[book.id];
      const isRead = progress?.is_read === 1;

      if (readFilter === 'read' && !isRead) return false;
      if (readFilter === 'unread' && isRead) return false;
      if (genreFilter !== 'all' && book.genre !== genreFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return book.title.toLowerCase().includes(q) || book.author.toLowerCase().includes(q);
      }
      return true;
    });
  }, [books, progressMap, search, readFilter, genreFilter]);

  const readFilterOptions: { value: 'all' | 'read' | 'unread'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'read', label: 'Read' },
    { value: 'unread', label: 'Unread' },
  ];

  return (
    <div className="space-y-5">
      {/* Filters row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by title or author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-800/70 border border-gray-700/50 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/30"
          />
        </div>

        {/* Read/Unread filter buttons */}
        <div className="flex rounded-lg overflow-hidden border border-gray-700/50">
          {readFilterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setReadFilter(opt.value)}
              className={`
                px-3 py-2 text-xs font-medium transition-colors
                ${readFilter === opt.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800/70 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Genre dropdown */}
        <select
          value={genreFilter}
          onChange={(e) => setGenreFilter(e.target.value)}
          className="px-3 py-2 bg-gray-800/70 border border-gray-700/50 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-indigo-500/70 cursor-pointer"
        >
          <option value="all">All Genres</option>
          {ALL_GENRES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <p className="text-xs text-gray-500">
        Showing <span className="text-gray-300 font-medium">{filtered.length}</span> of {books.length} books
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🔍</div>
          <p>No books match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((book) => {
            const progress = progressMap[book.id];
            return (
              <BookCard
                key={book.id}
                book={book}
                isRead={progress?.is_read === 1}
                rating={progress?.rating ?? null}
                onToggleRead={onToggleRead}
                onRate={onRate}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
