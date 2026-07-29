import {INTRO_AUDIO_TIMING, INTRO_TIMING} from './intro.config';

type IntroAudioOptions = {
  reducedMotion: boolean;
};

export function startIntroAudio({reducedMotion}: IntroAudioOptions): () => void {
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return () => undefined;

  const context = new AudioContextClass();
  let stopped = false;

  void context.resume().then(() => {
    if (stopped || context.state !== 'running') return;
    scheduleIntroAudio(context, reducedMotion);
  }).catch(() => {
    // Browsers may decline autoplay without a user gesture. The visual intro continues normally.
  });

  return () => {
    stopped = true;
    if (context.state !== 'closed') void context.close();
  };
}

function scheduleIntroAudio(context: AudioContext, reducedMotion: boolean) {
  const startAt = context.currentTime + toSeconds(INTRO_AUDIO_TIMING.startLeadMs);
  const logoAt = reducedMotion
    ? startAt
    : startAt + toSeconds(INTRO_TIMING.dawnMs + INTRO_TIMING.discMs + INTRO_TIMING.blackoutMs);
  const totalMs = reducedMotion
    ? INTRO_TIMING.reducedMotionHoldMs
    : INTRO_TIMING.dawnMs
      + INTRO_TIMING.discMs
      + INTRO_TIMING.blackoutMs
      + INTRO_TIMING.logoMs
      + INTRO_TIMING.homepageCrossfadeMs;
  const endAt = startAt + toSeconds(totalMs);

  const master = context.createGain();
  master.gain.value = INTRO_AUDIO_TIMING.masterGain;
  master.connect(context.destination);

  scheduleBreeze(context, master, startAt, endAt);
  scheduleChainHit(context, master, logoAt);
  scheduleBassSwell(context, master, logoAt, endAt);
}

function scheduleBreeze(
  context: AudioContext,
  destination: AudioNode,
  startAt: number,
  endAt: number,
) {
  const duration = endAt - startAt;
  const frameCount = Math.ceil(context.sampleRate * duration);
  const noiseBuffer = context.createBuffer(1, frameCount, context.sampleRate);
  const samples = noiseBuffer.getChannelData(0);

  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = Math.random() * 2 - 1;
  }

  const noise = context.createBufferSource();
  const highpass = context.createBiquadFilter();
  const lowpass = context.createBiquadFilter();
  const breezeGain = context.createGain();

  noise.buffer = noiseBuffer;
  highpass.type = 'highpass';
  highpass.frequency.value = INTRO_AUDIO_TIMING.breezeHighpassHz;
  lowpass.type = 'lowpass';
  lowpass.frequency.value = INTRO_AUDIO_TIMING.breezeLowpassHz;
  lowpass.Q.value = .35;

  breezeGain.gain.setValueAtTime(0, startAt);
  breezeGain.gain.linearRampToValueAtTime(
    INTRO_AUDIO_TIMING.breezeGain,
    startAt + toSeconds(INTRO_AUDIO_TIMING.breezeFadeInMs),
  );
  breezeGain.gain.setValueAtTime(
    INTRO_AUDIO_TIMING.breezeGain,
    Math.max(startAt, endAt - toSeconds(INTRO_AUDIO_TIMING.breezeFadeOutMs)),
  );
  breezeGain.gain.linearRampToValueAtTime(0, endAt);

  noise.connect(highpass).connect(lowpass).connect(breezeGain).connect(destination);
  noise.start(startAt);
  noise.stop(endAt);
}

function scheduleChainHit(context: AudioContext, destination: AudioNode, logoAt: number) {
  const decaySeconds = toSeconds(INTRO_AUDIO_TIMING.chainDecayMs);

  INTRO_AUDIO_TIMING.chainFrequenciesHz.forEach((frequency, index) => {
    const strikeAt = logoAt + toSeconds(index * INTRO_AUDIO_TIMING.chainStaggerMs);
    const oscillator = context.createOscillator();
    const strikeGain = context.createGain();

    oscillator.type = index % 2 === 0 ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(frequency, strikeAt);
    oscillator.detune.setValueAtTime(index * 3, strikeAt);
    strikeGain.gain.setValueAtTime(INTRO_AUDIO_TIMING.chainGain / (index + 1), strikeAt);
    strikeGain.gain.exponentialRampToValueAtTime(.0001, strikeAt + decaySeconds);

    oscillator.connect(strikeGain).connect(destination);
    oscillator.start(strikeAt);
    oscillator.stop(strikeAt + decaySeconds);
  });
}

function scheduleBassSwell(
  context: AudioContext,
  destination: AudioNode,
  logoAt: number,
  endAt: number,
) {
  const swellAt = Math.max(
    context.currentTime,
    logoAt - toSeconds(INTRO_AUDIO_TIMING.bassLeadMs),
  );
  const peakAt = logoAt + toSeconds(INTRO_AUDIO_TIMING.bassAttackMs);
  const releaseAt = Math.min(
    endAt,
    peakAt + toSeconds(INTRO_AUDIO_TIMING.bassReleaseMs),
  );
  const oscillator = context.createOscillator();
  const bassGain = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(INTRO_AUDIO_TIMING.bassStartHz, swellAt);
  oscillator.frequency.exponentialRampToValueAtTime(INTRO_AUDIO_TIMING.bassEndHz, releaseAt);
  bassGain.gain.setValueAtTime(.0001, swellAt);
  bassGain.gain.exponentialRampToValueAtTime(INTRO_AUDIO_TIMING.bassGain, peakAt);
  bassGain.gain.exponentialRampToValueAtTime(.0001, releaseAt);

  oscillator.connect(bassGain).connect(destination);
  oscillator.start(swellAt);
  oscillator.stop(releaseAt);
}

function toSeconds(milliseconds: number): number {
  return milliseconds / 1000;
}
