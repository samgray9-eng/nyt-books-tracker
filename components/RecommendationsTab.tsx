'use client';

import { useMemo, useState, useRef } from 'react';
import { Book } from '@/lib/books-data';
import { BookProgress } from '@/lib/db';
import { computeRecommendations, computeTasteProfile, RecommendationResult } from '@/lib/recommendation-engine';
import BookCard from './BookCard';

interface Props {
  books: Book[];
  progressMap: Record<number, BookProgress>;
  onToggleRead: (bookId: number, isRead: boolean) => void;
  onRate: (bookId: number, rating: number) => void;
}

interface AiResult {
  bookId: number;
  reason: string;
}

type DisplayRec = RecommendationResult & { isAi?: boolean };

export default function RecommendationsTab({ books, progressMap, onToggleRead, onRate }: Props) {
  const [aiResults, setAiResults] = useState<AiResult[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  // Cache key: stringified ratings fingerprint
  const ratingsFingerprintRef = useRef<string>('');

  const { recs, profile, hasRatings } = useMemo(() => {
    const recs = computeRecommendations(books, progressMap);
    const profile = computeTasteProfile(books, progressMap);
    const hasRatings = books.some(b => progressMap[b.id]?.is_read === 1 && progressMap[b.id]?.rating != null);
    return { recs, profile, hasRatings };
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
    // Build fingerprint of current ratings
    const fingerprint = books
      .filter(b => progressMap[b.id]?.rating != null)
      .map(b => `${b.id}:${progressMap[b.id].rating}`)
      .sort()
      .join(',');

    // Return cached result if ratings haven't changed
    if (fingerprint === ratingsFingerprintRef.current && aiResults) return;

    setAiLoading(true);
    setAiError(null);

    try {
      const ratedBooks = books
        .filter(b => progressMap[b.id]?.is_read === 1 && progressMap[b.id]?.rating != null)
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

  if (!hasRatings) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">⭐</div>
        <h3 className="text-xl font-semibold text-gray-200 mb-2">No ratings yet</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          Mark some books as read and rate them to unlock personalized recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Taste Profile Card */}
      {profile.summary && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 flex items-start gap-3">
          <div className="text-2xl mt-0.5">🧠</div>
          <div>
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">Your Taste Profile</p>
            <p className="text-gray-300 text-sm">{profile.summary}</p>
            {profile.topTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {profile.topTags.map(tag => (
                  <span key={tag} className="text-xs bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
                    {tag.replace(/-/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section header + AI button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white">Recommended for You</h2>
          <span className="text-xs text-gray-500 bg-gray-800 border border-gray-700 rounded-full px-3 py-1">
            {aiResults ? 'AI-reranked' : `${recs.length} picks · algorithm`}
          </span>
        </div>

        <button
          onClick={handleGetAiRecs}
          disabled={aiLoading || recs.length === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-150
            ${aiLoading
              ? 'border-purple-500/30 bg-purple-500/10 text-purple-400 cursor-not-allowed'
              : aiResults
              ? 'border-purple-500/40 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25'
              : 'border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/50'
            }`}
        >
          {aiLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              Asking Claude&hellip;
            </>
          ) : aiResults ? (
            <>&#10022; Refresh AI picks</>
          ) : (
            <>&#10022; Get AI explanation</>
          )}
        </button>
      </div>

      {aiError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {aiError}
        </div>
      )}

      {/* Recommendations grid — always visible */}
      {displayRecs.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-lg font-semibold text-gray-300">You&apos;ve read everything we can recommend!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayRecs.map((rec) => (
            <div key={rec.book.id} className="flex flex-col gap-2">
              <p className={`text-xs font-medium leading-snug ${rec.isAi ? 'text-purple-300' : 'text-indigo-400'}`}>
                {rec.isAi && <span className="mr-1">&#10022;</span>}
                {rec.reason}
              </p>
              <BookCard
                book={rec.book}
                isRead={!!(progressMap[rec.book.id]?.is_read)}
                rating={progressMap[rec.book.id]?.rating ?? null}
                onToggleRead={onToggleRead}
                onRate={onRate}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
