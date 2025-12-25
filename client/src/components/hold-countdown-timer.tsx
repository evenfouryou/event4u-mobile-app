import { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface HoldCountdownTimerProps {
  expiresAt: Date | string;
  onExpire?: () => void;
  onExtend?: () => void;
  onRelease?: () => void;
  canExtend?: boolean;
  className?: string;
  compact?: boolean;
}

export function HoldCountdownTimer({
  expiresAt,
  onExpire,
  onExtend,
  onRelease,
  canExtend = true,
  className,
  compact = false,
}: HoldCountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

  const calculateTimeLeft = useCallback(() => {
    const expireTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const diff = expireTime - now;
    return Math.max(0, Math.floor(diff / 1000));
  }, [expiresAt]);

  useEffect(() => {
    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      
      setIsUrgent(remaining <= 60);
      
      if (remaining <= 0) {
        setIsExpired(true);
        onExpire?.();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, calculateTimeLeft, onExpire]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalSeconds = 10 * 60;
  const progressPercent = Math.min(100, (timeLeft / totalSeconds) * 100);

  if (isExpired) {
    return (
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive",
        className
      )}>
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">Opzione scaduta</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
        isUrgent 
          ? "bg-destructive/10 text-destructive animate-pulse" 
          : "bg-primary/10 text-primary",
        className
      )}>
        <Clock className="h-3 w-3" />
        <span>{formatTime(timeLeft)}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "p-3 rounded-lg border",
      isUrgent ? "border-destructive bg-destructive/5" : "border-border bg-card",
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock className={cn("h-4 w-4", isUrgent && "text-destructive animate-pulse")} />
          <span className="text-sm font-medium">
            {isUrgent ? 'Opzione in scadenza!' : 'Tempo rimasto'}
          </span>
        </div>
        <span className={cn(
          "text-lg font-bold font-mono",
          isUrgent && "text-destructive"
        )}>
          {formatTime(timeLeft)}
        </span>
      </div>
      
      <Progress 
        value={progressPercent} 
        className={cn("h-2", isUrgent && "[&>div]:bg-destructive")}
        data-testid="hold-progress"
      />

      <div className="flex gap-2 mt-3">
        {canExtend && (
          <Button
            size="sm"
            variant="outline"
            onClick={onExtend}
            className="flex-1"
            data-testid="button-extend-hold"
          >
            Estendi tempo
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={onRelease}
          className="text-muted-foreground hover:text-destructive"
          data-testid="button-release-hold"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface HoldStatusBadgeProps {
  status: 'available' | 'held' | 'sold' | 'blocked' | 'my_hold';
  expiresAt?: Date | string;
  className?: string;
}

export function HoldStatusBadge({ status, expiresAt, className }: HoldStatusBadgeProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (status !== 'held' || !expiresAt) return;

    const calculateTimeLeft = () => {
      const expireTime = new Date(expiresAt).getTime();
      const now = Date.now();
      return Math.max(0, Math.floor((expireTime - now) / 1000));
    };

    setTimeLeft(calculateTimeLeft());
    
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [status, expiresAt]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'available':
        return { label: 'Disponibile', color: 'bg-green-500', textColor: 'text-green-50' };
      case 'my_hold':
        return { 
          label: expiresAt ? formatTime(timeLeft) : 'In opzione', 
          color: 'bg-blue-500 animate-pulse', 
          textColor: 'text-blue-50' 
        };
      case 'held':
        return { label: 'Occupato', color: 'bg-orange-500', textColor: 'text-orange-50' };
      case 'sold':
        return { label: 'Venduto', color: 'bg-gray-500', textColor: 'text-gray-50' };
      case 'blocked':
        return { label: 'Bloccato', color: 'bg-red-500', textColor: 'text-red-50' };
      default:
        return { label: 'N/A', color: 'bg-gray-400', textColor: 'text-gray-50' };
    }
  };

  const config = getStatusConfig();

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      config.color,
      config.textColor,
      className
    )}>
      {status === 'my_hold' && <Clock className="h-3 w-3" />}
      {config.label}
    </span>
  );
}
