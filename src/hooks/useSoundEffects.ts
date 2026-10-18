import { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '../lib/sound';

interface ShuffleLoopOptions {
  durationMs?: number;
  initialIntervalMs?: number;
  maxIntervalMs?: number;
  onTick?: (tickCount: number) => void;
  playRiserAtEnd?: boolean;
}

export function useSoundEffects() {
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.isSoundMuted());
  const shuffleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLoopRunningRef = useRef<boolean>(false);

  // Sync muted state
  const toggleMute = useCallback(() => {
    const next = sound.toggleMute();
    setIsMuted(next);
    return next;
  }, []);

  const setMute = useCallback((muted: boolean) => {
    sound.setMute(muted);
    setIsMuted(muted);
  }, []);

  const unlockAudio = useCallback(async () => {
    return await sound.unlockContext();
  }, []);

  // Quick effect triggers
  const playShuffleTick = useCallback((pitchFactor: number = 1.0) => {
    sound.playShuffleTick(pitchFactor);
  }, []);

  const playClick = useCallback(() => {
    sound.playClick();
  }, []);

  const playWhoosh = useCallback(() => {
    sound.playWhoosh();
  }, []);

  const playDrumroll = useCallback((durationSec: number = 2.0) => {
    sound.playDrumroll(durationSec);
  }, []);

  const playDramaticStageDrumroll = useCallback((durationSec: number = 6.8) => {
    sound.playDramaticStageDrumroll(durationSec);
  }, []);

  const stopDramaticStageDrumroll = useCallback(() => {
    sound.stopDramaticStageDrumroll();
  }, []);

  const playSuspenseHeartbeat = useCallback((intensity: number = 1.0) => {
    sound.playSuspenseHeartbeat(intensity);
  }, []);

  const playVictoryCymbalCrash = useCallback(() => {
    sound.playVictoryCymbalCrash();
  }, []);

  const playSuspenseRiser = useCallback((durationSec: number = 1.6) => {
    sound.playSuspenseRiser(durationSec);
  }, []);

  const playCelebrationFanfare = useCallback(() => {
    sound.playCelebrationFanfare();
  }, []);

  const playGrandPrizeFanfare = useCallback(() => {
    sound.playGrandPrizeFanfare();
  }, []);

  const playInaugurationFanfare = useCallback(() => {
    sound.playInaugurationFanfare();
  }, []);

  const playCountdownBeep = useCallback((isFinal: boolean = false) => {
    sound.playCountdownBeep(isFinal);
  }, []);

  const playNotificationDing = useCallback(() => {
    sound.playNotificationDing();
  }, []);

  const playTestSound = useCallback(async () => {
    await sound.unlockContext();
    sound.playNotificationDing();
    setTimeout(() => {
      sound.playCelebrationFanfare();
    }, 250);
  }, []);

  const playTestStageAudio = useCallback(async () => {
    await sound.unlockContext();
    sound.playDramaticStageDrumroll(2.2);
    setTimeout(() => {
      sound.playVictoryCymbalCrash();
    }, 2200);
  }, []);

  // Clean stop for active shuffle loop
  const stopShuffleLoop = useCallback(() => {
    isLoopRunningRef.current = false;
    if (shuffleTimerRef.current) {
      clearTimeout(shuffleTimerRef.current);
      shuffleTimerRef.current = null;
    }
  }, []);

  // Intelligent shuffle audio coordinator:
  // Starts fast mechanical ticks, gradually slows down, triggers dramatic riser before reveal
  const startShuffleLoop = useCallback(
    async (options?: ShuffleLoopOptions) => {
      stopShuffleLoop();
      await unlockAudio();

      const durationMs = options?.durationMs ?? 7000;
      const initialInterval = options?.initialIntervalMs ?? 75;
      const maxInterval = options?.maxIntervalMs ?? 420;
      const playRiser = options?.playRiserAtEnd !== false;

      isLoopRunningRef.current = true;
      const startTime = Date.now();
      let tickCount = 0;
      let riserTriggered = false;

      const scheduleNextTick = () => {
        if (!isLoopRunningRef.current) return;

        const elapsed = Date.now() - startTime;
        if (elapsed >= durationMs) {
          isLoopRunningRef.current = false;
          return;
        }

        const progress = Math.min(elapsed / durationMs, 1);

        // Sound the suspense riser in the last 1.8 seconds of shuffle
        if (playRiser && !riserTriggered && durationMs - elapsed <= 1800) {
          riserTriggered = true;
          sound.playSuspenseRiser(1.8);
        }

        // Pitch slightly increases and interval decelerates
        const pitch = 0.9 + progress * 0.45;
        sound.playShuffleTick(pitch);

        tickCount++;
        options?.onTick?.(tickCount);

        // Quadratic deceleration curve for authentic wheel inertia
        const nextInterval = initialInterval + Math.pow(progress, 2.2) * (maxInterval - initialInterval);

        shuffleTimerRef.current = setTimeout(scheduleNextTick, nextInterval);
      };

      scheduleNextTick();
    },
    [stopShuffleLoop, unlockAudio]
  );

  // Auto clean up on unmount
  useEffect(() => {
    return () => {
      stopShuffleLoop();
      sound.stopDramaticStageDrumroll();
    };
  }, [stopShuffleLoop]);

  return {
    isMuted,
    toggleMute,
    setMute,
    unlockAudio,
    playShuffleTick,
    playClick,
    playWhoosh,
    playDrumroll,
    playDramaticStageDrumroll,
    stopDramaticStageDrumroll,
    playSuspenseHeartbeat,
    playVictoryCymbalCrash,
    playSuspenseRiser,
    playCelebrationFanfare,
    playGrandPrizeFanfare,
    playInaugurationFanfare,
    playCountdownBeep,
    playNotificationDing,
    playTestSound,
    playTestStageAudio,
    startShuffleLoop,
    stopShuffleLoop,
  };
}
