'use client';

import { useState, useMemo } from 'react';
import { Book } from '@/lib/books-data';
import { BookProgress } from '@/lib/db';
import BookCard from './BookCard';

const ALL_GENRES = [
  'Literary Fiction', 'Historical Fiction', 'Science Fiction', 'Fantasy',
  'Memoir', 'Nonfiction', 'Short Stories', 'Horror', 'Young Adult', 'Romance',
];

type ReadFilter = 'all' | 'read' | 'reading' | 'unread';
type SortKey = 'rank' | 'title' | 'year' | 'rating';
type Status = 'unread' | 'reading' | 'read';

interface BrowseTabProps {
  books: Book[];
  progressMap: Record<number, BookProgress>;
  onSetStatus: (bookId: number, status: Status) => void;
  onRate: (bookId: number, rating: number) => void;
}

export default function BrowseTab({ books, progressMap, onSetStatus, onRate }: BrowseTabProps) {
  const [search, setSearch] = useState('');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [genreFilter, setGenreFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('rank');

  const filtered = useMemo(() => {
    const result = books.filter((book) => {
      const bookStatus = progressMap[book.id]?.status ?? 'unread';
      if (readFilter === 'read' && bookStatus !== 'read') return false;
      if (readFilter === 'reading' && bookStatus !== 'reading') return false;
      if (readFilter === 'unread' && bookStatus !== 'unread') return false;
      if (genreFilter !== 'all' && book.genre !== genreFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return book.title.toLowerCase().includes(q) || book.author.toLowerCase().includes(q);
      }
      return true;
    });

    return [...result].sort((a, b) => {
      if (sortKey === 'rank') return a.rank - b.rank;
      if (sortKey === 'title') return a.title.localeCompare(b.title);
      if (sortKey === 'year') return a.year - b.year;
      if (sortKey === 'rating') {
        const ra = progressMap[a.id]?.rating ?? -1;
        const rb = progressMap[b.id]?.rating ?? -1;
        return rb - ra;
      }
      return 0;
    });
  }, [books, progressMap, search, readFilter, genreFilter, sortKey]);

  const filterLabels: { value: ReadFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'read', label: 'Read' },
    { value: 'reading', label: 'Currently Reading' },
    { value: 'unread', label: 'Unread' },
  ];

  return (
    <div>
      {/* Filter bar — two rows */}
      <div className="border-b border-[#e2e2e2] pb-3 mb-0 space-y-2">
        {/* Row 1: Read filter + genre + search */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-4">
            {filterLabels.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setReadFilter(value)}
                className={`font-ui-caps transition-colors pb-0.5 ${
                  readFilter === value
                    ? 'text-[#d0021b] border-b-2 border-[#d0021b]'
                    : 'text-[#6b6b6b] hover:text-[#121212] border-b-2 border-transparent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            className="font-ui text-xs text-[#121212] border border-[#e2e2e2] bg-white px-2 py-1 focus:outline-none focus:border-[#121212] cursor-pointer"
          >
            <option value="all">All Genres</option>
            {ALL_GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>

          <input
            type="text"
            placeholder="Search title or author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="font-ui text-xs text-[#121212] border-b border-[#e2e2e2] bg-white px-1 py-1 focus:outline-none focus:border-[#121212] placeholder-[#aaaaaa] flex-1 min-w-[160px] max-w-xs"
            style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
          />
        </div>

        {/* Row 2: Sort + count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-ui-caps text-[#6b6b6b]">Sort:</span>
            {(['rank', 'title', 'year', 'rating'] as SortKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSortKey(key)}
                className={`font-ui-caps transition-colors pb-0.5 ${
                  sortKey === key
                    ? 'text-[#d0021b] border-b-2 border-[#d0021b]'
                    : 'text-[#6b6b6b] hover:text-[#121212] border-b-2 border-transparent'
                }`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
          <span className="font-ui-caps text-[#6b6b6b]">{filtered.length} books</span>
        </div>
      </div>

      {/* 2-column newspaper grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-headline text-lg text-[#6b6b6b]">No books match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          {filtered.map((book) => {
            const progress = progressMap[book.id];
            return (
              <BookCard
                key={book.id}
                book={book}
                status={progress?.status ?? 'unread'}
                rating={progress?.rating ?? null}
                onSetStatus={onSetStatus}
                onRate={onRate}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
