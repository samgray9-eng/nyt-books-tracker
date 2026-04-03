'use client';

interface StarRatingProps {
  rating: number | null;
  onRate: (rating: number) => void;
}

export default function StarRating({ rating, onRate }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5 mt-1">
      <span className="font-ui-caps text-[#6b6b6b] mr-2">Rate:</span>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => {
        const isSelected = rating !== null && num <= rating;
        return (
          <button
            key={num}
            onClick={(e) => { e.stopPropagation(); onRate(num); }}
            title={`Rate ${num}/10`}
            className={`w-5 h-5 text-xs font-bold border transition-colors font-ui
              ${isSelected
                ? 'bg-[#d0021b] border-[#d0021b] text-white'
                : 'bg-white border-[#e2e2e2] text-[#6b6b6b] hover:border-[#d0021b] hover:text-[#d0021b]'
              }`}
          >
            {num}
          </button>
        );
      })}
      {rating !== null && (
        <span className="ml-2 font-ui text-xs font-bold text-[#d0021b]">{rating}/10</span>
      )}
    </div>
  );
}
