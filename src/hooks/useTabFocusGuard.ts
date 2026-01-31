import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTabFocusGuardOptions {
  isActive: boolean;
  onFocusLost: () => void;
  onFocusRestored: () => void;
  onViolation: (reason: string) => void;
  maxFocusLosses?: number;
}

export const useTabFocusGuard = ({
  isActive,
  onFocusLost,
  onFocusRestored,
  onViolation,
  maxFocusLosses = 3,
}: UseTabFocusGuardOptions) => {
  const [isFocused, setIsFocused] = useState(true);
  const [focusLossCount, setFocusLossCount] = useState(0);
  const focusLossCountRef = useRef(0);

  const handleVisibilityChange = useCallback(() => {
    if (!isActive) return;

    if (document.hidden) {
      setIsFocused(false);
      focusLossCountRef.current += 1;
      setFocusLossCount(focusLossCountRef.current);
      onFocusLost();

      if (focusLossCountRef.current > maxFocusLosses) {
        onViolation('Saiu da aba muitas vezes durante o vídeo');
      }
    } else {
      setIsFocused(true);
      onFocusRestored();
    }
  }, [isActive, onFocusLost, onFocusRestored, onViolation, maxFocusLosses]);

  const handleWindowBlur = useCallback(() => {
    if (!isActive) return;
    setIsFocused(false);
    onFocusLost();
  }, [isActive, onFocusLost]);

  const handleWindowFocus = useCallback(() => {
    if (!isActive) return;
    setIsFocused(true);
    onFocusRestored();
  }, [isActive, onFocusRestored]);

  useEffect(() => {
    if (!isActive) return;

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isActive, handleVisibilityChange, handleWindowBlur, handleWindowFocus]);

  const reset = useCallback(() => {
    focusLossCountRef.current = 0;
    setFocusLossCount(0);
    setIsFocused(true);
  }, []);

  return {
    isFocused,
    focusLossCount,
    reset,
  };
};
