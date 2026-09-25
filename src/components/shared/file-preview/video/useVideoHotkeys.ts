import { useEffect, type RefObject } from 'react';

interface UseVideoHotkeysProps {
  enabled: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  onTogglePlay: () => void;
  onSeek: (seconds: number, autoplay?: boolean, manual?: boolean) => void;
  onStepFrame: (direction: 'back' | 'forward') => void;
  onToggleFullscreen: () => void;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
  onTogglePictureInPicture?: () => void;
  wakeControls: () => void;
}

export function useVideoHotkeys({
  enabled,
  containerRef,
  videoRef,
  currentTime,
  duration,
  isPlaying,
  volume,
  isMuted,
  onTogglePlay,
  onSeek,
  onStepFrame,
  onToggleFullscreen,
  onToggleMute,
  onVolumeChange,
  onTogglePictureInPicture,
  wakeControls,
}: UseVideoHotkeysProps) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl instanceof HTMLElement && activeEl.isContentEditable);

      if (isInputFocused) return;

      const isContainerFocused =
        containerRef.current === activeEl || (containerRef.current && containerRef.current.contains(activeEl));
      if (!isContainerFocused) return;

      const key = event.key.toLowerCase();

      if (event.key === ' ' || event.code === 'Space' || key === 'k') {
        event.preventDefault();
        wakeControls();
        onTogglePlay();
      } else if (event.key === 'ArrowLeft' || key === 'j') {
        event.preventDefault();
        wakeControls();
        if (event.shiftKey) {
          onStepFrame('back');
        } else {
          const delta = key === 'j' ? 10 : 5;
          const video = videoRef.current;
          const currentVideoTime = video?.currentTime ?? currentTime;
          onSeek(Math.max(0, currentVideoTime - delta), isPlaying, true);
        }
      } else if (event.key === 'ArrowRight' || key === 'l') {
        event.preventDefault();
        wakeControls();
        if (event.shiftKey) {
          onStepFrame('forward');
        } else {
          const delta = key === 'l' ? 10 : 5;
          const video = videoRef.current;
          const currentVideoTime = video?.currentTime ?? currentTime;
          const videoDuration = Number.isFinite(video?.duration) && video!.duration > 0 ? video!.duration : duration;
          onSeek(Math.min(videoDuration, currentVideoTime + delta), isPlaying, true);
        }
      } else if (event.key === ',' || event.key === '<') {
        event.preventDefault();
        wakeControls();
        onStepFrame('back');
      } else if (event.key === '.' || event.key === '>') {
        event.preventDefault();
        wakeControls();
        onStepFrame('forward');
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        wakeControls();
        const nextVolume = Math.min(1, Math.round((volume + 0.1) * 10) / 10);
        onVolumeChange(nextVolume);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        wakeControls();
        const nextVolume = Math.max(0, Math.round((volume - 0.1) * 10) / 10);
        onVolumeChange(nextVolume);
      } else if (key === 'f') {
        event.preventDefault();
        onToggleFullscreen();
      } else if (key === 'm') {
        event.preventDefault();
        onToggleMute();
      } else if (key === 'p' && onTogglePictureInPicture) {
        event.preventDefault();
        onTogglePictureInPicture();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    containerRef,
    videoRef,
    currentTime,
    duration,
    isPlaying,
    volume,
    isMuted,
    onTogglePlay,
    onSeek,
    onStepFrame,
    onToggleFullscreen,
    onToggleMute,
    onVolumeChange,
    onTogglePictureInPicture,
    wakeControls,
  ]);
}
