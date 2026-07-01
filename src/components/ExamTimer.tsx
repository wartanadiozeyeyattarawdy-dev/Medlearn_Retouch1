import { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface ExamTimerProps {
  durationMinutes: number;
  onTimeUp: () => void;
  onTimeUpdate?: (remaining: number) => void;
}

export function ExamTimer({ durationMinutes, onTimeUp, onTimeUpdate }: ExamTimerProps) {
  const [remaining, setRemaining] = useState(durationMinutes * 60);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    if (remaining <= 0) {
      onTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setRemaining(prev => {
        const newValue = prev - 1;
        onTimeUpdate?.(newValue);
        
        // Alerte quand il reste moins de 5 minutes
        if (newValue <= 300 && !isWarning) {
          setIsWarning(true);
        }
        
        return newValue;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remaining, onTimeUp, onTimeUpdate, isWarning]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  const formatTime = (mins: number, secs: number) => {
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const progress = ((durationMinutes * 60 - remaining) / (durationMinutes * 60)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className={`h-5 w-5 ${isWarning ? 'text-destructive animate-pulse' : 'text-primary'}`} />
          <span className={`font-extrabold text-xl ${isWarning ? 'text-destructive' : ''}`}>
            {formatTime(minutes, seconds)}
          </span>
        </div>
        {isWarning && (
          <span className="flex items-center gap-1 text-xs text-destructive font-bold">
            <AlertTriangle className="h-4 w-4" />
            Temps presque écoulé !
          </span>
        )}
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div 
          className={`h-full transition-all ${isWarning ? 'bg-destructive' : 'bg-primary'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}