import { useEffect, useRef, useCallback } from 'react';

interface UseTimerOptions {
  duration: number;
  onTick?: () => void;
  onComplete?: () => void;
  autoStart?: boolean;
  isActive?: boolean;
}

export function useTimer({
  duration,
  onTick,
  onComplete,
  autoStart = false,
  isActive = true,
}: UseTimerOptions) {
  const intervalRef = useRef<number | null>(null);
  const timeRef = useRef(duration);
  const isRunningRef = useRef(autoStart);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (intervalRef.current) return;

    isRunningRef.current = true;
    intervalRef.current = window.setInterval(() => {
      if (timeRef.current <= 0) {
        clearTimer();
        isRunningRef.current = false;
        onComplete?.();
        return;
      }

      timeRef.current -= 1;
      onTick?.();
    }, 1000);
  }, [clearTimer, onTick, onComplete]);

  const stop = useCallback(() => {
    clearTimer();
    isRunningRef.current = false;
  }, [clearTimer]);

  const reset = useCallback((newDuration?: number) => {
    clearTimer();
    timeRef.current = newDuration ?? duration;
    isRunningRef.current = false;
  }, [clearTimer, duration]);

  const restart = useCallback((newDuration?: number) => {
    reset(newDuration);
    start();
  }, [reset, start]);

  // Auto-start if specified
  useEffect(() => {
    if (autoStart && isActive) {
      start();
    }
    return clearTimer;
  }, [autoStart, isActive, start, clearTimer]);

  // Pause/resume based on isActive
  useEffect(() => {
    if (!isActive) {
      clearTimer();
    } else if (isRunningRef.current) {
      start();
    }
  }, [isActive, start, clearTimer]);

  // Reset when duration changes
  useEffect(() => {
    timeRef.current = duration;
  }, [duration]);

  return {
    start,
    stop,
    reset,
    restart,
    isRunning: isRunningRef.current,
  };
}
