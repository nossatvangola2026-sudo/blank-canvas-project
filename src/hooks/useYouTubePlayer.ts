import { useState, useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface UseYouTubePlayerOptions {
  videoId: string;
  targetDuration: number;
  onComplete: () => void;
  onViolation: (reason: string) => void;
}

interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  watchedTime: number;
  isReady: boolean;
  hasEnded: boolean;
}

export const useYouTubePlayer = ({
  videoId,
  targetDuration,
  onComplete,
  onViolation,
}: UseYouTubePlayerOptions) => {
  const playerRef = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef<number>(0);
  const watchedTimeRef = useRef<number>(0);
  const pauseCountRef = useRef<number>(0);
  const lastPauseTimeRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    watchedTime: 0,
    isReady: false,
    hasEnded: false,
  });

  const loadYouTubeAPI = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (window.YT && window.YT.Player) {
        resolve();
        return;
      }

      const existingScript = document.getElementById('youtube-iframe-api');
      if (existingScript) {
        window.onYouTubeIframeAPIReady = () => resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = 'youtube-iframe-api';
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      
      window.onYouTubeIframeAPIReady = () => resolve();
      document.body.appendChild(script);
    });
  }, []);

  const initializePlayer = useCallback(async () => {
    await loadYouTubeAPI();

    if (!containerRef.current) return;

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        playsinline: 1,
      },
      events: {
        onReady: (event) => {
          const duration = event.target.getDuration();
          setState((prev) => ({ ...prev, isReady: true, duration }));
          event.target.playVideo();
        },
        onStateChange: (event) => {
          const playerState = event.data;
          
          switch (playerState) {
            case window.YT.PlayerState.PLAYING:
              setState((prev) => ({ ...prev, isPlaying: true }));
              startTimeTracking();
              break;
            case window.YT.PlayerState.PAUSED:
              setState((prev) => ({ ...prev, isPlaying: false }));
              handlePause();
              break;
            case window.YT.PlayerState.ENDED:
              handleVideoEnded();
              break;
            case window.YT.PlayerState.BUFFERING:
              // Check for seeking during buffering
              checkForSeeking();
              break;
          }
        },
      },
    });
  }, [videoId, loadYouTubeAPI]);

  const startTimeTracking = useCallback(() => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }

    checkIntervalRef.current = setInterval(() => {
      if (!playerRef.current) return;

      const currentTime = playerRef.current.getCurrentTime();
      const timeDiff = currentTime - lastTimeRef.current;

      // Detect seeking (jump greater than 2 seconds)
      if (Math.abs(timeDiff) > 2 && lastTimeRef.current > 0) {
        isSeekingRef.current = true;
        onViolation('Tentativa de avançar o vídeo detectada');
        
        // Reset to last valid position
        playerRef.current.seekTo(lastTimeRef.current, true);
        isSeekingRef.current = false;
        return;
      }

      // Only count time if playing normally (small increments)
      if (timeDiff > 0 && timeDiff <= 1.5) {
        watchedTimeRef.current += timeDiff;
      }

      lastTimeRef.current = currentTime;
      
      setState((prev) => ({
        ...prev,
        currentTime,
        watchedTime: watchedTimeRef.current,
      }));
    }, 500);
  }, [onViolation]);

  const checkForSeeking = useCallback(() => {
    if (!playerRef.current || isSeekingRef.current) return;

    const currentTime = playerRef.current.getCurrentTime();
    const timeDiff = currentTime - lastTimeRef.current;

    if (Math.abs(timeDiff) > 3) {
      onViolation('Tentativa de manipular o tempo do vídeo');
      playerRef.current.seekTo(lastTimeRef.current, true);
    }
  }, [onViolation]);

  const handlePause = useCallback(() => {
    pauseCountRef.current += 1;
    lastPauseTimeRef.current = Date.now();

    // Max 5 pauses allowed
    if (pauseCountRef.current > 5) {
      onViolation('Excesso de pausas durante o vídeo');
    }

    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }
  }, [onViolation]);

  const handleVideoEnded = useCallback(() => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }

    const watchedPercentage = (watchedTimeRef.current / targetDuration) * 100;
    
    setState((prev) => ({ ...prev, isPlaying: false, hasEnded: true }));

    // Require at least 90% of the target duration to be watched
    if (watchedPercentage >= 90) {
      onComplete();
    } else {
      onViolation(`Vídeo não foi assistido completamente (${watchedPercentage.toFixed(0)}%)`);
    }
  }, [targetDuration, onComplete, onViolation]);

  const playVideo = useCallback(() => {
    playerRef.current?.playVideo();
  }, []);

  const pauseVideo = useCallback(() => {
    playerRef.current?.pauseVideo();
  }, []);

  const destroy = useCallback(() => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }
    playerRef.current?.destroy();
    playerRef.current = null;
  }, []);

  useEffect(() => {
    initializePlayer();

    return () => {
      destroy();
    };
  }, [initializePlayer, destroy]);

  return {
    containerRef,
    state,
    playVideo,
    pauseVideo,
    destroy,
    remainingTime: Math.max(targetDuration - watchedTimeRef.current, 0),
  };
};
