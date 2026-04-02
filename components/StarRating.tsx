'use client';

interface StarRatingProps {
  rating: number | null;
  onRate: (rating: number) => void;
}

export default function StarRating({ rating, onRate }: StarRatingProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-xs text-gray-400 mr-1">Rate:</span>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => {
        const isSelected = rating !== null && num <= rating;
        return (
          <button
            key={num}
            onClick={(e) => {
              e.stopPropagation();
              onRate(num);
            }}
            title={`Rate ${num}/10`}
            className={`
              w-6 h-6 rounded text-xs font-bold border transition-all duration-150
              ${isSelected
                ? 'bg-amber-400 border-amber-300 text-amber-900 shadow-sm shadow-amber-400/30'
                : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:bg-amber-400/20 hover:border-amber-400/50 hover:text-amber-300'
              }
            `}
          >
            {num}
          </button>
        );
      })}
      {rating && (
        <span className="ml-1 text-xs font-semibold text-amber-400">{rating}/10</span>
      )}
    </div>
  );
}
