import { useRef, useCallback, useEffect } from 'react';

type SoundEffect = 'siren' | 'success' | 'click' | 'warning' | 'tick';

interface AudioRefs {
  siren: HTMLAudioElement | null;
  success: HTMLAudioElement | null;
  click: HTMLAudioElement | null;
  warning: HTMLAudioElement | null;
  tick: HTMLAudioElement | null;
}

// Sound URLs - these can be replaced with actual audio files
// For now, we'll use Web Audio API to generate simple sounds
const SOUND_CONFIG: Record<SoundEffect, { frequency: number; duration: number; type: OscillatorType }> = {
  siren: { frequency: 800, duration: 0.5, type: 'sawtooth' },
  success: { frequency: 523.25, duration: 0.2, type: 'sine' }, // C5
  click: { frequency: 1000, duration: 0.05, type: 'square' },
  warning: { frequency: 440, duration: 0.3, type: 'triangle' },
  tick: { frequency: 1200, duration: 0.02, type: 'square' },
};

export function useAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRefsRef = useRef<AudioRefs>({
    siren: null,
    success: null,
    click: null,
    warning: null,
    tick: null,
  });
  const isMutedRef = useRef(false);
  const volumeRef = useRef(0.5);

  // Initialize audio context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      // Use standard AudioContext or webkit fallback for Safari
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
      } else {
        throw new Error('Web Audio API is not supported in this browser');
      }
    }

    // Resume context if it was suspended (improves performance and browser compatibility)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(err => {
        console.warn('Failed to resume audio context:', err);
      });
    }

    return audioContextRef.current;
  }, []);

  // Play a synthesized sound effect
  const playSynthSound = useCallback((sound: SoundEffect) => {
    if (isMutedRef.current) return;

    try {
      const ctx = getAudioContext();
      const config = SOUND_CONFIG[sound];

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = config.type;
      oscillator.frequency.setValueAtTime(config.frequency, ctx.currentTime);

      // Volume envelope
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volumeRef.current, ctx.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + config.duration);

      // Special handling for siren - add frequency modulation
      if (sound === 'siren') {
        oscillator.frequency.setValueAtTime(400, ctx.currentTime);
        oscillator.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.25);
        oscillator.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.5);
      }

      // Special handling for success - play a chord
      if (sound === 'success') {
        const osc2 = ctx.createOscillator();
        const osc3 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        const gain3 = ctx.createGain();

        osc2.connect(gain2);
        osc3.connect(gain3);
        gain2.connect(ctx.destination);
        gain3.connect(ctx.destination);

        osc2.type = 'sine';
        osc3.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc3.frequency.setValueAtTime(783.99, ctx.currentTime); // G5

        gain2.gain.setValueAtTime(0, ctx.currentTime);
        gain2.gain.linearRampToValueAtTime(volumeRef.current * 0.5, ctx.currentTime + 0.01);
        gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

        gain3.gain.setValueAtTime(0, ctx.currentTime);
        gain3.gain.linearRampToValueAtTime(volumeRef.current * 0.5, ctx.currentTime + 0.05);
        gain3.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);

        osc2.start(ctx.currentTime);
        osc3.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.4);
        osc3.stop(ctx.currentTime + 0.45);
      }

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + config.duration + 0.1);
    } catch (error) {
      console.warn('Audio playback failed:', error);
    }
  }, [getAudioContext]);

  // Play audio from a URL
  const playAudioUrl = useCallback(async (url: string): Promise<HTMLAudioElement | null> => {
    if (isMutedRef.current) return null;

    try {
      const audio = new Audio(url);
      audio.volume = volumeRef.current;
      await audio.play();
      return audio;
    } catch (error) {
      console.warn('Audio URL playback failed:', error);
      return null;
    }
  }, []);

  // Stop all playing audio
  const stopAll = useCallback(() => {
    Object.values(audioRefsRef.current).forEach((audio) => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });

    // Suspend audio context to save resources when not in use
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      audioContextRef.current.suspend().catch(err => {
        console.warn('Failed to suspend audio context:', err);
      });
    }
  }, []);

  // Mute/unmute
  const setMuted = useCallback((muted: boolean) => {
    isMutedRef.current = muted;
    if (muted) {
      stopAll();
    }
  }, [stopAll]);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    volumeRef.current = Math.max(0, Math.min(1, volume));
    Object.values(audioRefsRef.current).forEach((audio) => {
      if (audio) {
        audio.volume = volumeRef.current;
      }
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopAll]);

  return {
    play: playSynthSound,
    playUrl: playAudioUrl,
    stopAll,
    setMuted,
    setVolume,
    isMuted: isMutedRef.current,
    volume: volumeRef.current,
  };
}

export type AudioPlayer = ReturnType<typeof useAudio>;
