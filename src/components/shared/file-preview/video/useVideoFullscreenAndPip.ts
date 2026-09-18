import { useState, useCallback, useEffect, type RefObject } from 'react';

interface UseVideoFullscreenAndPipProps {
  containerRef: RefObject<HTMLDivElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
}

export function useVideoFullscreenAndPip({ containerRef, videoRef }: UseVideoFullscreenAndPipProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      try {
        await container.requestFullscreen();
      } catch {
        // Fallback gracefully
      }
    } else if (document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        // Fallback for mock environments
      }
    }
  }, [containerRef]);

  const togglePictureInPicture = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPictureInPicture(false);
      } else if (document.pictureInPictureEnabled && typeof video.requestPictureInPicture === 'function') {
        await video.requestPictureInPicture();
        setIsPictureInPicture(true);
      }
    } catch {
      // Fallback gracefully
    }
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnter = () => setIsPictureInPicture(true);
    const onLeave = () => setIsPictureInPicture(false);
    video.addEventListener('enterpictureinpicture', onEnter);
    video.addEventListener('leavepictureinpicture', onLeave);
    return () => {
      video.removeEventListener('enterpictureinpicture', onEnter);
      video.removeEventListener('leavepictureinpicture', onLeave);
    };
  }, [videoRef]);

  return {
    isFullscreen,
    setIsFullscreen,
    isPictureInPicture,
    toggleFullscreen,
    togglePictureInPicture,
  };
}
