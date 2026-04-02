'use client';

import { useState, useEffect, useCallback } from 'react';
import { BOOKS } from '@/lib/books-data';
import { BookProgress } from '@/lib/db';
import SummaryBar from '@/components/SummaryBar';
import BrowseTab from '@/components/BrowseTab';
import RecommendationsTab from '@/components/RecommendationsTab';

type Tab = 'browse' | 'recommendations';

export default function Home() {
  const [progressMap, setProgressMap] = useState<Record<number, BookProgress>>({});
  const [activeTab, setActiveTab] = useState<Tab>('browse');
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch('/api/books');
      if (!res.ok) throw new Error('Failed to fetch');
      const data: BookProgress[] = await res.json();
      const map: Record<number, BookProgress> = {};
      data.forEach((p) => { map[p.book_id] = p; });
      setProgressMap(map);
    } catch (err) {
      console.error('Failed to load progress:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const handleToggleRead = async (bookId: number, isRead: boolean) => {
    // Optimistic update
    setProgressMap((prev) => ({
      ...prev,
      [bookId]: {
        book_id: bookId,
        is_read: isRead ? 1 : 0,
        rating: prev[bookId]?.rating ?? null,
        read_date: isRead ? new Date().toISOString() : null,
      },
    }));

    try {
      await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: isRead }),
      });
    } catch (err) {
      console.error('Failed to update:', err);
      fetchProgress(); // Revert on error
    }
  };

  const handleRate = async (bookId: number, rating: number) => {
    // Optimistic update
    setProgressMap((prev) => ({
      ...prev,
      [bookId]: {
        book_id: bookId,
        is_read: prev[bookId]?.is_read ?? 1,
        rating,
        read_date: prev[bookId]?.read_date ?? new Date().toISOString(),
      },
    }));

    try {
      await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true, rating }),
      });
    } catch (err) {
      console.error('Failed to rate:', err);
      fetchProgress();
    }
  };

  const readCount = Object.values(progressMap).filter((p) => p.is_read === 1).length;
  const ratedBooks = Object.values(progressMap).filter((p) => p.is_read === 1 && p.rating != null);
  const averageRating =
    ratedBooks.length > 0
      ? ratedBooks.reduce((sum, p) => sum + (p.rating ?? 0), 0) / ratedBooks.length
      : null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'browse', label: 'Browse All' },
    { id: 'recommendations', label: 'Recommendations' },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#0f0f14' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-800/80" style={{ background: 'rgba(15, 15, 20, 0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                <span className="text-indigo-400">NYT</span> 100 Best Books
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">21st Century Reading Tracker</p>
            </div>
            {!loading && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">{readCount}/100 read</span>
                <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                    style={{ width: `${readCount}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Summary bar */}
        {!loading && (
          <SummaryBar
            readCount={readCount}
            totalCount={100}
            averageRating={averageRating}
          />
        )}

        {loading && (
          <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-8 text-center">
            <div className="inline-block w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-gray-400">Loading your reading progress...</p>
          </div>
        )}

        {/* Tab navigation */}
        <div className="flex gap-1 border-b border-gray-700/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
                ${activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600'
                }
              `}
            >
              {tab.label}
              {tab.id === 'recommendations' && ratedBooks.length > 0 && (
                <span className="ml-2 text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full px-1.5 py-0.5">
                  {ratedBooks.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {!loading && (
          <>
            {activeTab === 'browse' && (
              <BrowseTab
                books={BOOKS}
                progressMap={progressMap}
                onToggleRead={handleToggleRead}
                onRate={handleRate}
              />
            )}
            {activeTab === 'recommendations' && (
              <RecommendationsTab
                books={BOOKS}
                progressMap={progressMap}
                onToggleRead={handleToggleRead}
                onRate={handleRate}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
