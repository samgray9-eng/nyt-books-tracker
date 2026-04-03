'use client';

import { useMemo, useState, useRef } from 'react';
import { Book } from '@/lib/books-data';
import { BookProgress } from '@/lib/db';
import { computeRecommendations, computeTasteProfile, RecommendationResult } from '@/lib/recommendation-engine';
import BookCard from './BookCard';

type Status = 'unread' | 'reading' | 'read';

interface Props {
  books: Book[];
  progressMap: Record<number, BookProgress>;
  onSetStatus: (bookId: number, status: Status) => void;
  onRate: (bookId: number, rating: number) => void;
}

interface AiResult {
  bookId: number;
  reason: string;
}

type DisplayRec = RecommendationResult & { isAi?: boolean };

export default function RecommendationsTab({ books, progressMap, onSetStatus, onRate }: Props) {
  const [aiResults, setAiResults] = useState<AiResult[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const ratingsFingerprintRef = useRef<string>('');

  const { recs, profile, hasRatings, currentlyReading } = useMemo(() => {
    const recs = computeRecommendations(books, progressMap);
    const profile = computeTasteProfile(books, progressMap);
    const hasRatings = books.some(b => progressMap[b.id]?.status === 'read' && progressMap[b.id]?.rating != null);
    const currentlyReading = books.filter(b => progressMap[b.id]?.status === 'reading');
    return { recs, profile, hasRatings, currentlyReading };
  }, [books, progressMap]);

  const displayRecs = useMemo((): DisplayRec[] => {
    if (!aiResults) return recs;
    const bookMap = Object.fromEntries(recs.map(r => [r.book.id, r]));
    return aiResults
      .map(ai => {
        const local = bookMap[ai.bookId];
        if (!local) return null;
        return { ...local, reason: ai.reason, isAi: true };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }, [aiResults, recs]);

  async function handleGetAiRecs() {
    const fingerprint = books
      .filter(b => progressMap[b.id]?.rating != null)
      .map(b => `${b.id}:${progressMap[b.id].rating}`)
      .sort()
      .join(',');

    if (fingerprint === ratingsFingerprintRef.current && aiResults) return;

    setAiLoading(true);
    setAiError(null);

    try {
      const ratedBooks = books
        .filter(b => progressMap[b.id]?.status === 'read' && progressMap[b.id]?.rating != null)
        .map(b => ({ title: b.title, author: b.author, rating: progressMap[b.id].rating, genre: b.genre }));

      const candidates = recs.slice(0, 10).map(r => ({
        id: r.book.id,
        title: r.book.title,
        author: r.book.author,
        genre: r.book.genre,
        description: r.book.description,
      }));

      const res = await fetch('/api/recommendations/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ratedBooks, candidates }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Request failed');
      }

      const data = await res.json();
      setAiResults(data.reranked);
      ratingsFingerprintRef.current = fingerprint;
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setAiLoading(false);
    }
  }

  if (!hasRatings && currentlyReading.length === 0) {
    return (
      <div className="py-20 text-center border-t border-[#e2e2e2]">
        <p className="font-headline text-2xl text-[#121212] mb-2">No ratings yet</p>
        <p className="text-[#6b6b6b] text-sm" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
          Mark some books as read and rate them to get personalized recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Currently Reading — "Finish these first" */}
      {currentlyReading.length > 0 && (
        <div>
          <div className="mb-3">
            <p className="font-ui-caps text-[#d0021b]">Finish These First</p>
            <div className="h-px bg-[#e2e2e2] mt-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            {currentlyReading.map(book => (
              <BookCard
                key={book.id}
                book={book}
                status="reading"
                rating={progressMap[book.id]?.rating ?? null}
                onSetStatus={onSetStatus}
                onRate={onRate}
              />
            ))}
          </div>
        </div>
      )}

      {hasRatings && (
        <>
          {/* Taste Profile Card */}
          {profile.summary && (
            <div className="border border-[#e2e2e2] p-4 bg-[#f7f7f5]">
              <p className="font-ui-caps text-[#d0021b] mb-1">Your Taste Profile</p>
              <p className="font-headline text-[#121212] text-sm leading-relaxed">{profile.summary}</p>
              {profile.topTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.topTags.map(tag => (
                    <span key={tag} className="font-ui-caps text-[#6b6b6b] border border-[#e2e2e2] px-2 py-0.5">
                      {tag.replace(/-/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section header + AI button */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-headline text-2xl font-bold text-[#121212]">Recommended for You</h2>
              <div className="h-px bg-[#e2e2e2] mt-2" />
            </div>

            <button
              onClick={handleGetAiRecs}
              disabled={aiLoading || recs.length === 0}
              className="font-ui-caps text-[#6b6b6b] border border-[#e2e2e2] px-3 py-1.5 hover:border-[#121212] hover:text-[#121212] transition-colors"
            >
              {aiLoading ? 'Asking Claude...' : aiResults ? 'Refresh AI Picks' : '✦ Get AI Explanation'}
            </button>
          </div>

          {aiLoading && (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-[#d0021b] border-t-transparent rounded-full animate-spin" />
              <span className="font-ui-caps text-[#6b6b6b]">Asking Claude...</span>
            </div>
          )}

          {aiError && (
            <div className="border border-[#e2e2e2] px-4 py-3 text-sm text-[#d0021b] font-ui">
              {aiError}
            </div>
          )}

          {displayRecs.length === 0 ? (
            <div className="py-16 text-center border-t border-[#e2e2e2]">
              <p className="font-headline text-lg text-[#6b6b6b]">You&apos;ve read everything we can recommend!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              {displayRecs.map((rec) => (
                <div key={rec.book.id} className="flex flex-col">
                  <p className="font-headline text-xs italic text-[#6b6b6b] mb-1 leading-snug pt-4">
                    {(rec as { isAi?: boolean }).isAi && <span className="text-[#d0021b] mr-1">✦</span>}
                    {rec.reason}
                  </p>
                  <BookCard
                    book={rec.book}
                    status={progressMap[rec.book.id]?.status ?? 'unread'}
                    rating={progressMap[rec.book.id]?.rating ?? null}
                    onSetStatus={onSetStatus}
                    onRate={onRate}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
