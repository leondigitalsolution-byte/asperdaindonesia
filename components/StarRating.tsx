
import React from 'react';
import { Star } from 'lucide-react';

interface Props {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: number;
}

export const StarRating: React.FC<Props> = ({ rating, onRatingChange, readOnly = false, size = 24 }) => {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="flex gap-1">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onRatingChange && onRatingChange(star)}
          className={`transition-all duration-200 ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
        >
          <Star 
            size={size} 
            className={`${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300 fill-slate-100'} stroke-1`} 
          />
        </button>
      ))}
    </div>
  );
};
