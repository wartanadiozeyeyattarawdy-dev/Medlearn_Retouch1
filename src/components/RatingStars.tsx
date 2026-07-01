import { useState } from "react";
import { Star } from "lucide-react";

interface RatingStarsProps {
  rating: number;
  total?: number;
  readonly?: boolean;
  onRate?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
}

export function RatingStars({ 
  rating, 
  total, 
  readonly = true, 
  onRate, 
  size = "md" 
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(rating);

  const sizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const handleClick = (value: number) => {
    if (readonly) return;
    setSelectedRating(value);
    onRate?.(value);
  };

  const handleHover = (value: number) => {
    if (readonly) return;
    setHoverRating(value);
  };

  const handleLeave = () => {
    if (readonly) return;
    setHoverRating(0);
  };

  const displayRating = readonly ? rating : (hoverRating || selectedRating);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          className={readonly ? "cursor-default" : "cursor-pointer"}
          onClick={() => handleClick(value)}
          onMouseEnter={() => handleHover(value)}
          onMouseLeave={handleLeave}
          disabled={readonly}
        >
          <Star
            className={`${sizes[size]} ${
              value <= displayRating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            } transition-colors`}
          />
        </button>
      ))}
      {total !== undefined && (
        <span className="text-sm text-muted-foreground ml-1">
          ({total} avis)
        </span>
      )}
    </div>
  );
}