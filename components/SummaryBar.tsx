'use client';

interface SummaryBarProps {
  readCount: number;
  totalCount: number;
  averageRating: number | null;
}

export default function SummaryBar({ readCount, totalCount, averageRating }: SummaryBarProps) {
  const percentage = Math.round((readCount / totalCount) * 100);

  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-3xl font-bold text-white">{readCount}</span>
            <span className="text-gray-400 text-lg"> / {totalCount} books read</span>
          </div>
          {averageRating !== null && (
            <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 rounded-lg px-3 py-1.5">
              <span className="text-amber-400 text-lg">★</span>
              <span className="text-amber-300 font-semibold">Avg Rating: {averageRating.toFixed(1)}</span>
            </div>
          )}
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-indigo-400">{percentage}%</span>
          <span className="text-gray-500 text-sm ml-1">complete</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-gray-700/50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 40%, #a78bfa 70%, #c4b5fd 100%)',
            boxShadow: percentage > 0 ? '0 0 12px rgba(139, 92, 246, 0.5)' : 'none',
          }}
        />
        {percentage > 0 && (
          <div
            className="absolute top-0 h-full w-8 bg-white/20 blur-sm rounded-full"
            style={{ left: `calc(${percentage}% - 16px)` }}
          />
        )}
      </div>

      {/* Genre breakdown hint */}
      <p className="text-xs text-gray-500 mt-2 text-right">
        {totalCount - readCount} books remaining
      </p>
    </div>
  );
}
