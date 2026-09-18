import { useCallback, useEffect, type RefObject } from 'react';
import { useVideoVolumeStore } from '@/stores/videoVolumeStore';

interface UseVideoVolumeSyncProps {
  videoRef: RefObject<HTMLVideoElement | null>;
}

export function useVideoVolumeSync({ videoRef }: UseVideoVolumeSyncProps) {
  const volume = useVideoVolumeStore((state) => state.volume);
  const isMuted = useVideoVolumeStore((state) => state.isMuted);
  const setStoreVolume = useVideoVolumeStore((state) => state.setVolume);
  const toggleStoreMute = useVideoVolumeStore((state) => state.toggleMute);

  const applyVolumeToVideo = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      try {
        video.volume = useVideoVolumeStore.getState().volume;
        video.muted = useVideoVolumeStore.getState().isMuted;
      } catch {
        // Fallback for environments where volume assignment is restricted
      }
    }
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      try {
        video.volume = volume;
        video.muted = isMuted;
      } catch {
        // Fallback for environments where volume assignment is restricted
      }
    }
  }, [volume, isMuted, videoRef]);

  const toggleMute = useCallback(() => {
    toggleStoreMute();
    applyVolumeToVideo();
  }, [toggleStoreMute, applyVolumeToVideo]);

  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      setStoreVolume(newVolume);
      const video = videoRef.current;
      if (video) {
        try {
          video.volume = newVolume;
          video.muted = newVolume === 0;
        } catch {
          // Fallback for environments where volume assignment is restricted
        }
      }
    },
    [setStoreVolume, videoRef],
  );

  return {
    volume,
    isMuted,
    toggleMute,
    handleVolumeChange,
    applyVolumeToVideo,
  };
}
