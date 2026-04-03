'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { BOOKS } from '@/lib/books-data';
import { BookProgress } from '@/lib/db';
import SummaryBar from '@/components/SummaryBar';
import BrowseTab from '@/components/BrowseTab';
import RecommendationsTab from '@/components/RecommendationsTab';
import AuthButton from '@/components/AuthButton';

type Tab = 'browse' | 'recommendations';

export default function Home() {
  const { data: session, status } = useSession();
  const [progressMap, setProgressMap] = useState<Record<number, BookProgress>>({});
  const [activeTab, setActiveTab] = useState<Tab>('browse');
  const [loading, setLoading] = useState(true);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const fetchProgress = useCallback(async () => {
    setLoading(true);
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

  useEffect(() => {
    if (status === 'authenticated') fetchProgress();
    if (status === 'unauthenticated') { setProgressMap({}); setLoading(false); }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSetStatus = async (bookId: number, newStatus: 'unread' | 'reading' | 'read') => {
    if (!session?.user) { setShowLoginPrompt(true); return; }
    setProgressMap((prev) => ({
      ...prev,
      [bookId]: {
        book_id: bookId,
        is_read: newStatus === 'read' ? 1 : 0,
        status: newStatus,
        rating: prev[bookId]?.rating ?? null,
        read_date: newStatus === 'read' ? new Date().toISOString() : (prev[bookId]?.read_date ?? null),
        notes: prev[bookId]?.notes ?? null,
      },
    }));
    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed');
    } catch (err) {
      console.error('Failed to update:', err);
      fetchProgress();
    }
  };

  const handleRate = async (bookId: number, rating: number) => {
    if (!session?.user) { setShowLoginPrompt(true); return; }
    setProgressMap((prev) => ({
      ...prev,
      [bookId]: {
        book_id: bookId,
        is_read: 1,
        status: 'read',
        rating,
        read_date: prev[bookId]?.read_date ?? new Date().toISOString(),
        notes: prev[bookId]?.notes ?? null,
      },
    }));
    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'read', rating }),
      });
      if (!res.ok) throw new Error('Failed');
    } catch (err) {
      console.error('Failed to rate:', err);
      fetchProgress();
    }
  };

  const readCount = Object.values(progressMap).filter((p) => p.status === 'read').length;
  const readingCount = Object.values(progressMap).filter((p) => p.status === 'reading').length;
  const ratedBooks = Object.values(progressMap).filter((p) => p.status === 'read' && p.rating != null);
  const averageRating = ratedBooks.length > 0
    ? ratedBooks.reduce((sum, p) => sum + (p.rating ?? 0), 0) / ratedBooks.length
    : null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'browse', label: 'Browse All' },
    { id: 'recommendations', label: 'Recommendations' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b-2 border-[#121212] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-baseline gap-4">
              <div>
                <span className="font-ui-caps text-[#d0021b] block text-xs">The New York Times</span>
                <h1 className="font-headline text-2xl font-bold text-[#121212] leading-none">
                  100 Best Books of the 21st Century
                </h1>
              </div>
              {!loading && session && (
                <span className="font-ui-caps text-[#6b6b6b] hidden sm:block">
                  {readCount} / 100 Read
                </span>
              )}
            </div>
            <AuthButton />
          </div>
        </div>
        {/* Red rule */}
        <div className="h-0.5 bg-[#d0021b]" />
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Summary bar */}
        {!loading && session && (
          <SummaryBar readCount={readCount} totalCount={100} averageRating={averageRating} readingCount={readingCount} />
        )}

        {/* Sign-in banner */}
        {status !== 'loading' && !session && (
          <div className="border border-[#e2e2e2] p-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-headline font-bold text-[#121212]">Track your reading progress</p>
              <p className="text-sm text-[#6b6b6b] mt-0.5" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
                Log in to mark books as read, rate them, and get personalised recommendations.
              </p>
            </div>
            <button
              onClick={() => signIn('google')}
              className="font-ui-caps text-[#d0021b] border border-[#d0021b] px-4 py-2 hover:bg-[#d0021b] hover:text-white transition-colors whitespace-nowrap"
            >
              Log In
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="py-16 text-center">
            <div className="inline-block w-8 h-8 border-2 border-[#d0021b] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-ui-caps text-[#6b6b6b]">Loading</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 border-b border-[#e2e2e2]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`font-ui-caps px-4 py-2 border-b-2 transition-colors -mb-px mr-4 ${
                activeTab === tab.id
                  ? 'border-[#d0021b] text-[#d0021b]'
                  : 'border-transparent text-[#6b6b6b] hover:text-[#121212]'
              }`}
            >
              {tab.label}
              {tab.id === 'recommendations' && ratedBooks.length > 0 && (
                <span className="ml-1.5 font-ui-caps text-[#d0021b]">{ratedBooks.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {!loading && (
          <>
            {activeTab === 'browse' && (
              <BrowseTab books={BOOKS} progressMap={progressMap} onSetStatus={handleSetStatus} onRate={handleRate} />
            )}
            {activeTab === 'recommendations' && (
              <RecommendationsTab books={BOOKS} progressMap={progressMap} onSetStatus={handleSetStatus} onRate={handleRate} />
            )}
          </>
        )}
      </main>

      {/* Login prompt toast */}
      {showLoginPrompt && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-white border border-[#121212] px-5 py-3">
          <span className="text-sm text-[#121212]" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
            Log in to track your reading progress
          </span>
          <button
            onClick={() => signIn('google')}
            className="font-ui-caps text-[#d0021b] underline underline-offset-2 hover:text-[#121212] transition-colors whitespace-nowrap"
          >
            Log In →
          </button>
          <button onClick={() => setShowLoginPrompt(false)} className="font-ui-caps text-[#6b6b6b] hover:text-[#121212] ml-1 text-xs">✕</button>
        </div>
      )}
    </div>
  );
}
