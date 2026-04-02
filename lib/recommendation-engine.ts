import { Book } from './books-data';
import { BookProgress } from './db';
import { BOOK_TAGS } from './book-tags';

// ── IDF ──────────────────────────────────────────────────────────────────────
function computeIDF(books: Book[]): Record<string, number> {
  const N = books.length;
  const df: Record<string, number> = {};
  books.forEach(b => {
    (BOOK_TAGS[b.id] ?? []).forEach(tag => { df[tag] = (df[tag] ?? 0) + 1; });
  });
  const idf: Record<string, number> = {};
  Object.entries(df).forEach(([tag, count]) => {
    idf[tag] = Math.log(N / count);
  });
  return idf;
}

// ── Rating weight ─────────────────────────────────────────────────────────────
// 10/10 ≈ 4× the weight of 6/10; ratings below ~4 go negative
const K = Math.log(4) / 4; // ≈ 0.347
export function ratingWeight(r: number): number {
  return Math.exp(K * (r - 6)) - 0.5;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface RecommendationResult {
  book: Book;
  score: number;
  reason: string;
}

export interface TasteProfile {
  favoriteGenre: string | null;
  topTags: string[];
  preferredEra: 'pre-2010' | 'post-2010' | 'mixed' | null;
  avgRating: number;
  summary: string;
}

// ── Taste profile ─────────────────────────────────────────────────────────────
export function computeTasteProfile(
  books: Book[],
  progressMap: Record<number, BookProgress>,
): TasteProfile {
  const rated = books.filter(b => progressMap[b.id]?.is_read === 1 && progressMap[b.id]?.rating != null);
  if (rated.length === 0) return { favoriteGenre: null, topTags: [], preferredEra: null, avgRating: 0, summary: '' };

  const idf = computeIDF(books);

  // Favourite genre by avg rating
  const genreMap: Record<string, { sum: number; count: number }> = {};
  rated.forEach(b => {
    const r = progressMap[b.id]!.rating!;
    if (!genreMap[b.genre]) genreMap[b.genre] = { sum: 0, count: 0 };
    genreMap[b.genre].sum += r;
    genreMap[b.genre].count += 1;
  });
  const favoriteGenre = Object.entries(genreMap)
    .sort((a, b) => b[1].sum / b[1].count - a[1].sum / a[1].count)[0]?.[0] ?? null;

  // Top tags by weighted IDF
  const tagScores: Record<string, number> = {};
  rated.forEach(b => {
    const w = ratingWeight(progressMap[b.id]!.rating!);
    (BOOK_TAGS[b.id] ?? []).forEach(tag => {
      tagScores[tag] = (tagScores[tag] ?? 0) + w * (idf[tag] ?? 0);
    });
  });
  const topTags = Object.entries(tagScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  // Era preference from high-rated (≥7) books
  const highRated = rated.filter(b => (progressMap[b.id]?.rating ?? 0) >= 7);
  const avgYear = highRated.length > 0 ? highRated.reduce((s, b) => s + b.year, 0) / highRated.length : null;
  const preferredEra = avgYear == null ? null : avgYear < 2008 ? 'pre-2010' : avgYear > 2012 ? 'post-2010' : 'mixed';

  const avgRating = rated.reduce((s, b) => s + progressMap[b.id]!.rating!, 0) / rated.length;

  // Human-readable summary
  const tagDisplay = topTags.slice(0, 3).map(t => t.replace(/-/g, ' ')).join(', ');
  const eraStr = preferredEra === 'pre-2010' ? ', published before 2010' : preferredEra === 'post-2010' ? ', published after 2010' : '';
  const summary = `You tend to love ${favoriteGenre ?? 'varied genres'}${tagDisplay ? ` with themes of ${tagDisplay}` : ''}${eraStr}.`;

  return { favoriteGenre, topTags, preferredEra, avgRating, summary };
}

// ── Main scoring ──────────────────────────────────────────────────────────────
export function computeRecommendations(
  books: Book[],
  progressMap: Record<number, BookProgress>,
): RecommendationResult[] {
  const rated = books.filter(b => progressMap[b.id]?.is_read === 1 && progressMap[b.id]?.rating != null);
  if (rated.length === 0) return [];

  const idf = computeIDF(books);

  const unread = books.filter(b => !progressMap[b.id] || progressMap[b.id].is_read === 0);

  // Diversity: how many books have been READ per genre/author
  const readGenreCounts: Record<string, number> = {};
  const readAuthorCounts: Record<string, number> = {};
  books.filter(b => progressMap[b.id]?.is_read === 1).forEach(b => {
    readGenreCounts[b.genre] = (readGenreCounts[b.genre] ?? 0) + 1;
    readAuthorCounts[b.author] = (readAuthorCounts[b.author] ?? 0) + 1;
  });

  const scored = unread.map(candidate => {
    const cTags = BOOK_TAGS[candidate.id] ?? [];

    // TF-IDF weighted score
    let score = 0;
    rated.forEach(rb => {
      const w = ratingWeight(progressMap[rb.id]!.rating!);
      const rTags = BOOK_TAGS[rb.id] ?? [];
      const shared = cTags.filter(t => rTags.includes(t));
      score += w * shared.reduce((s, t) => s + (idf[t] ?? 0), 0);
    });

    // Diversity penalty
    const gCount = readGenreCounts[candidate.genre] ?? 0;
    const aCount = readAuthorCounts[candidate.author] ?? 0;
    if (gCount >= 3) score *= Math.max(0.3, 1 - (gCount - 2) * 0.15);
    if (aCount >= 2) score *= 0.5;

    return { book: candidate, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .map(s => ({
      book: s.book,
      score: s.score,
      reason: buildReason(s.book, rated, progressMap, idf),
    }));
}

function buildReason(
  candidate: Book,
  rated: Book[],
  progressMap: Record<number, BookProgress>,
  idf: Record<string, number>,
): string {
  const cTags = BOOK_TAGS[candidate.id] ?? [];
  let best: { book: Book; tag: string; rating: number } | null = null;
  let bestScore = -Infinity;

  rated.forEach(rb => {
    const r = progressMap[rb.id]!.rating!;
    const w = ratingWeight(r);
    const rTags = BOOK_TAGS[rb.id] ?? [];
    const shared = cTags.filter(t => rTags.includes(t));
    const sc = w * shared.reduce((s, t) => s + (idf[t] ?? 0), 0);
    if (sc > bestScore) {
      bestScore = sc;
      const topTag = shared.sort((a, b) => (idf[b] ?? 0) - (idf[a] ?? 0))[0];
      best = { book: rb, tag: topTag, rating: r };
    }
  });

  if (!best) return 'Matches your taste profile';
  const b = best as { book: Book; tag: string; rating: number };
  return b.tag
    ? `Because you loved "${b.book.title}" (${b.rating}/10) — shares ${b.tag.replace(/-/g, ' ')} themes`
    : `Similar to "${b.book.title}" which you rated ${b.rating}/10`;
}
