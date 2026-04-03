'use client';

interface SummaryBarProps {
  readCount: number;
  totalCount: number;
  averageRating: number | null;
  readingCount: number;
}

export default function SummaryBar({ readCount, totalCount, averageRating, readingCount }: SummaryBarProps) {
  const percentage = Math.round((readCount / totalCount) * 100);

  return (
    <div className="border-y border-[#e2e2e2] py-4 bg-white">
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
        <div className="flex items-baseline gap-2">
          <span className="font-headline text-4xl font-bold text-[#121212]">{readCount}</span>
          <span className="font-ui-caps text-[#6b6b6b]">of {totalCount} read</span>
        </div>
        {readingCount > 0 && (
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-4xl font-bold text-[#d0021b]">{readingCount}</span>
            <span className="font-ui-caps text-[#6b6b6b]">currently reading</span>
          </div>
        )}
        {averageRating !== null && (
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-4xl font-bold text-[#121212]">{averageRating.toFixed(1)}</span>
            <span className="font-ui-caps text-[#6b6b6b]">avg rating</span>
          </div>
        )}
        <div className="flex items-baseline gap-2">
          <span className="font-headline text-4xl font-bold text-[#d0021b]">{percentage}%</span>
          <span className="font-ui-caps text-[#6b6b6b]">complete</span>
        </div>
      </div>
      {/* Progress bar */}
      <div className="mt-3 h-0.5 bg-[#e2e2e2] w-full">
        <div
          className="h-full bg-[#d0021b] transition-all duration-700"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
