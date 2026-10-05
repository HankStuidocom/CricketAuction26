// ─── Web Audio API Sound System ────────────────────────────────────────────────
// Generates sounds procedurally using the Web Audio API — no audio files needed.

let audioCtx: AudioContext | null = null;
let isMuted = false;

function getAudioContext(): AudioContext | null {
  if (isMuted) return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.3,
  delay = 0
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + delay);

  gainNode.gain.setValueAtTime(0, ctx.currentTime + delay);
  gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

  oscillator.start(ctx.currentTime + delay);
  oscillator.stop(ctx.currentTime + delay + duration);
}

/** Play a bid placed sound — ascending double tone */
export function playBidSound(): void {
  playTone(440, 0.1, 'sine', 0.2);
  playTone(660, 0.15, 'sine', 0.25, 0.1);
}

/** Play timer tick — short click */
export function playTimerTick(): void {
  playTone(800, 0.05, 'square', 0.1);
}

/** Play urgent tick (< 3s) — higher pitched */
export function playUrgentTick(): void {
  playTone(1200, 0.05, 'square', 0.15);
}

/** Play sold sound — triumphant ascending arpeggio */
export function playSoldSound(): void {
  const notes = [261.63, 329.63, 392.0, 523.25];
  notes.forEach((freq, i) => {
    playTone(freq, 0.3, 'sine', 0.4, i * 0.12);
  });
  // Extra punch
  playTone(1047, 0.5, 'sine', 0.3, 0.5);
}

/** Play unsold sound — descending sad tone */
export function playUnsoldSound(): void {
  playTone(392, 0.2, 'sine', 0.2);
  playTone(261.63, 0.4, 'sine', 0.2, 0.2);
}

/** Play outbid notification — alert beep */
export function playOutbidSound(): void {
  playTone(880, 0.1, 'square', 0.2);
  playTone(660, 0.15, 'square', 0.2, 0.12);
}

/** Play winning sound — long triumphant chord */
export function playWinSound(): void {
  const chord = [261.63, 329.63, 392.0, 523.25, 659.25];
  chord.forEach(freq => playTone(freq, 2, 'sine', 0.15));
}

/** Toggle mute state */
export function toggleMute(): boolean {
  isMuted = !isMuted;
  if (isMuted && audioCtx) {
    audioCtx.suspend();
  } else if (!isMuted && audioCtx) {
    audioCtx.resume();
  }
  return isMuted;
}

/** Get current mute state */
export function getMuteState(): boolean {
  return isMuted;
}
