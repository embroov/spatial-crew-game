export interface DJTrack {
  id: string;
  name: string;
  genre?: string;
  bpm?: number;
  isProcedural?: boolean;
  url?: string;
}

export interface DJMusicState {
  isPlaying: boolean;
  trackId: string;
  trackName: string;
  trackUrl?: string;
  customUrl?: string;
  djName: string;
  startedAt: number; // timestamp
}

/**
 * Utility to convert Google Drive / Dropbox share links to direct audio streaming URLs.
 * Example Google Drive links:
 * - https://drive.google.com/file/d/1234567890abcdef/view?usp=sharing
 * - https://drive.google.com/open?id=1234567890abcdef
 * Converts to:
 * - https://docs.google.com/uc?export=download&id=1234567890abcdef
 */
export function formatAudioUrl(url: string): string {
  if (!url) return '';
  const cleanUrl = url.trim();

  // If already proxied
  if (cleanUrl.includes('/api/proxy-audio')) {
    return cleanUrl;
  }

  // Check for Google Drive URL or File ID
  if (cleanUrl.includes('drive.google.com') || cleanUrl.includes('docs.google.com') || cleanUrl.includes('drive.usercontent.google.com')) {
    const serverUrl = (import.meta.env.VITE_SERVER_URL || '').replace(/\/$/, '');
    return `${serverUrl}/api/proxy-audio?url=${encodeURIComponent(cleanUrl)}`;
  }

  // Match Dropbox share links: ?dl=0 -> ?raw=1
  if (cleanUrl.includes('dropbox.com') && cleanUrl.endsWith('?dl=0')) {
    return cleanUrl.replace('?dl=0', '?raw=1');
  }

  return cleanUrl;
}

/**
 * CONFIGURABLE SONG LIST WITH LINKS
 * Edit song names and paste your Google Drive (or direct MP3) links here.
 */
export const SONG_LIST: DJTrack[] = [
  {
    id: 'song_1',
    name: '🎵 Ghagra',
    isProcedural: false,
    url: 'https://drive.google.com/file/d/12ft_sf8FRTu1UAnE45DTXTgEXI9sS_JO/view?usp=sharing',
  },
  {
    id: 'song_2',
    name: '🎵 Teri Baaton Mein Aisa Uljha Jiya',
    isProcedural: false,
    url: 'https://drive.google.com/file/d/10Ygu2I6KCOZDAlP6hGWGCgjeAG9cEcLw/view?usp=drive_link',
  },
];

export const DEFAULT_TRACK: DJTrack = SONG_LIST[0];

export const PROCEDURAL_TRACKS: DJTrack[] = [];

export let PRESET_TRACKS: DJTrack[] = [...SONG_LIST];

export async function fetchAvailableTracks(): Promise<DJTrack[]> {
  PRESET_TRACKS = SONG_LIST;
  return SONG_LIST;
}

export class DJMusicEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private pannerNode: StereoPannerNode | PannerNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Custom audio element & buffer source for MP3 streams
  private audioEl: HTMLAudioElement | null = null;
  private audioElSource: MediaElementAudioSourceNode | null = null;
  private audioBufferSource: AudioBufferSourceNode | null = null;

  // Procedural synth timer
  private synthInterval: number | null = null;
  private stepCount: number = 0;

  // Current State
  private isPlaying: boolean = false;
  private currentTrack: DJTrack = DEFAULT_TRACK;
  private djName: string = 'Automated DJ';
  private masterVolume: number = 0.8;
  private spatialMultiplier: number = 1.0;

  // Stage location center
  private stageCenterX: number = 4150;
  private stageCenterY: number = 1500;
  private maxAudibleRadius: number = 750;

  constructor() {
    // AudioContext will be initialized on user interaction / setup
  }

  public init(existingCtx?: AudioContext | null) {
    if (existingCtx && existingCtx.state !== 'closed') {
      this.audioCtx = existingCtx;
    }
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      this.masterGain = null;
      this.pannerNode = null;
      this.analyser = null;
    }

    if (this.audioCtx && (!this.masterGain || !this.analyser)) {
      try {
        this.masterGain = this.audioCtx.createGain();
        if (typeof (this.audioCtx as any).createStereoPanner === 'function') {
          this.pannerNode = (this.audioCtx as any).createStereoPanner();
        } else {
          this.pannerNode = this.audioCtx.createPanner();
        }
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 64;

        this.masterGain.connect(this.pannerNode as any);
        (this.pannerNode as any).connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);
        this.updateEffectiveVolume();
      } catch (err) {
        console.warn('DJEngine init error:', err);
      }
    }
  }

  public async ensureContextResumed() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  public playTrack(trackId: string, customUrl?: string, djName: string = 'DJ', startTime: number = Date.now()) {
    this.init();
    this.ensureContextResumed();

    const preset = PRESET_TRACKS.find(t => t.id === trackId);
    if (preset) {
      this.currentTrack = preset;
    } else if (customUrl) {
      this.currentTrack = {
        id: 'custom_track',
        name: '🎵 Custom Track Stream',
        genre: 'Custom Audio',
        bpm: 120,
        isProcedural: false,
        url: customUrl
      };
    }

    this.djName = djName;
    this.stopPlayback();

    this.isPlaying = true;

    if (this.currentTrack.isProcedural) {
      this.startProceduralSynth(this.currentTrack.id);
    } else if (this.currentTrack.url) {
      this.startCustomAudioUrl(this.currentTrack.url);
    }
  }

  public pauseTrack() {
    this.isPlaying = false;
    this.stopPlayback();
  }

  public stopPlayback() {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    if (this.audioBufferSource) {
      try {
        this.audioBufferSource.stop();
        this.audioBufferSource.disconnect();
      } catch (e) {}
      this.audioBufferSource = null;
    }
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.src = '';
      this.audioEl = null;
    }
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    this.updateEffectiveVolume();
  }

  public updateSpatialVolume(playerX: number, playerY: number) {
    // DJ Room Boundaries: X: 3500..4800, Y: 1300..2300
    const inRoomX = playerX >= 3480 && playerX <= 4820;
    const inRoomY = playerY >= 1280 && playerY <= 2320;
    const isInDjRoom = inRoomX && inRoomY;

    if (isInDjRoom) {
      this.spatialMultiplier = 1.0;
    } else {
      const distOutsideX = playerX < 3480 ? 3480 - playerX : playerX > 4820 ? playerX - 4820 : 0;
      const distOutsideY = playerY < 1280 ? 1280 - playerY : playerY > 2320 ? playerY - 2320 : 0;
      const distOutside = Math.sqrt(distOutsideX * distOutsideX + distOutsideY * distOutsideY);

      const fadeOutBuffer = 250; // Smoothly fades out and stops within 250px outside room
      if (distOutside >= fadeOutBuffer) {
        this.spatialMultiplier = 0.0; // Completely stopped / silent outside room
      } else {
        this.spatialMultiplier = 1.0 - (distOutside / fadeOutBuffer);
      }
    }

    // 3D Surround Stereo Panning (-1.0 Left to +1.0 Right) relative to stage center (4150, 1500)
    // If player is on left side of room, stage is to their right -> pan right
    // If player is on right side of room, stage is to their left -> pan left
    const relativeX = (this.stageCenterX - playerX) / 500;
    const pan = Math.max(-0.85, Math.min(0.85, relativeX));

    if (this.pannerNode && this.audioCtx && 'pan' in this.pannerNode) {
      (this.pannerNode as StereoPannerNode).pan.setValueAtTime(pan, this.audioCtx.currentTime);
    }

    this.updateEffectiveVolume();
  }

  private updateEffectiveVolume() {
    const finalVol = this.isPlaying ? this.masterVolume * this.spatialMultiplier : 0;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(finalVol, this.audioCtx.currentTime, 0.05);
    }
    if (this.audioEl) {
      this.audioEl.volume = Math.max(0, Math.min(1, finalVol));
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTrack(): DJTrack {
    return this.currentTrack;
  }

  public getDjName(): string {
    return this.djName;
  }

  public getFrequencyData(array: Uint8Array): void {
    if (this.analyser && this.isPlaying) {
      this.analyser.getByteFrequencyData(array as any);
    } else {
      array.fill(0);
    }
  }

  // --- Procedural Synth Engine ---
  private startProceduralSynth(trackId: string) {
    if (!this.audioCtx || !this.masterGain) return;
    this.stepCount = 0;

    const bpm = this.currentTrack.bpm || 120;
    const stepTimeMs = (60 / bpm / 4) * 1000; // 16th note step duration

    this.synthInterval = window.setInterval(() => {
      if (!this.isPlaying || !this.audioCtx || !this.masterGain) return;

      const time = this.audioCtx.currentTime;
      const step = this.stepCount % 16;
      this.stepCount++;

      switch (trackId) {
        case 'cyberpunk_synth':
          this.playCyberpunkStep(step, time);
          break;
        case 'neon_club':
          this.playNeonClubStep(step, time);
          break;
        case 'lofi_chill':
          this.playLofiStep(step, time);
          break;
        case 'arcade_8bit':
          this.play8BitStep(step, time);
          break;
        default:
          this.playCyberpunkStep(step, time);
          break;
      }
    }, stepTimeMs);
  }

  // 1. Cyberpunk Synthwave Procedural Loop
  private playCyberpunkStep(step: number, time: number) {
    if (!this.audioCtx || !this.masterGain) return;

    // Heavy Kick on 0, 4, 8, 12
    if (step % 4 === 0) {
      this.triggerKick(time, 130, 40, 0.25);
    }
    // Snare / Clap on 4, 12
    if (step === 4 || step === 12) {
      this.triggerSnare(time, 0.2);
    }
    // Hi-hat on every odd step
    if (step % 2 === 1) {
      this.triggerHiHat(time, step % 4 === 3 ? 0.08 : 0.04);
    }

    // Sawtooth Synth Bassline (C Minor scale: C2, Eb2, F2, G2, Bb2)
    const bassNotes = [65.41, 65.41, 77.78, 65.41, 87.31, 65.41, 98.0, 77.78, 65.41, 65.41, 77.78, 116.54, 87.31, 77.78, 65.41, 98.0];
    const freq = bassNotes[step];
    this.triggerSynthPulse(time, freq, 'sawtooth', 0.12, 0.18, 800);

    // Synth Lead arpeggio on steps 2, 6, 10, 14
    if (step % 2 === 0) {
      const leadNotes = [261.63, 311.13, 392.00, 466.16, 523.25, 392.00, 311.13, 261.63];
      const leadFreq = leadNotes[(step / 2) % leadNotes.length];
      this.triggerSynthPulse(time, leadFreq, 'square', 0.08, 0.1, 1400);
    }
  }

  // 2. Neon Club EDM Loop
  private playNeonClubStep(step: number, time: number) {
    if (!this.audioCtx || !this.masterGain) return;

    // Four-on-the-floor Punchy Kick
    if (step % 4 === 0) {
      this.triggerKick(time, 160, 45, 0.22);
    }
    // Offbeat Hi-hat
    if (step % 4 === 2) {
      this.triggerHiHat(time, 0.1);
    }
    // Clap on 4, 12
    if (step === 4 || step === 12) {
      this.triggerSnare(time, 0.22);
    }

    // Fast Arpeggiator (A Minor: A3, C4, E4, G4)
    const arp = [220, 261.63, 329.63, 392.00];
    const freq = arp[step % 4];
    this.triggerSynthPulse(time, freq, 'sawtooth', 0.07, 0.15, 2000);
  }

  // 3. Lo-Fi Chill Loop
  private playLofiStep(step: number, time: number) {
    if (!this.audioCtx || !this.masterGain) return;

    // Soft Kick on 0, 10
    if (step === 0 || step === 10) {
      this.triggerKick(time, 90, 35, 0.3);
    }
    // Rimshot / Soft Snare on 4, 12
    if (step === 4 || step === 12) {
      this.triggerSnare(time, 0.15, 400);
    }
    // Soft Jazz Chords (Triangle wave)
    if (step === 0 || step === 8) {
      const chord = step === 0 ? [174.61, 220, 261.63, 329.63] : [146.83, 174.61, 220, 261.63]; // Fmaj7 -> Dm7
      chord.forEach(f => this.triggerSynthPulse(time, f, 'triangle', 0.4, 0.1, 600));
    }
  }

  // 4. 8-Bit Arcade Rush
  private play8BitStep(step: number, time: number) {
    if (!this.audioCtx || !this.masterGain) return;

    // Fast Chiptune Kick / Noise Snare
    if (step % 4 === 0) {
      this.triggerKick(time, 180, 50, 0.15);
    }
    if (step === 4 || step === 12) {
      this.triggerSnare(time, 0.15, 1200);
    }

    // Square wave chiptune melody
    const tune = [523.25, 587.33, 659.25, 783.99, 880.00, 783.99, 659.25, 587.33];
    const note = tune[step % tune.length];
    this.triggerSynthPulse(time, note, 'square', 0.08, 0.2, 3000);
  }

  // --- Sound Helper Generators ---
  private triggerKick(time: number, startFreq: number, endFreq: number, duration: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration);

    gain.gain.setValueAtTime(1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  private triggerSnare(time: number, duration: number, cutoff: number = 1000) {
    if (!this.audioCtx || !this.masterGain) return;

    // White Noise buffer
    const bufferSize = this.audioCtx.sampleRate * duration;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = cutoff;

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
  }

  private triggerHiHat(time: number, duration: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const bufferSize = this.audioCtx.sampleRate * duration;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
  }

  private triggerSynthPulse(time: number, freq: number, type: OscillatorType, duration: number, gainLevel: number, cutoff: number) {
    if (!this.audioCtx || !this.masterGain) return;

    const osc = this.audioCtx.createOscillator();
    const filter = this.audioCtx.createBiquadFilter();
    const gain = this.audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, time);

    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  // --- Custom Audio Stream Support ---
  private async startCustomAudioUrl(rawUrl: string) {
    this.stopPlayback();
    this.init();
    await this.ensureContextResumed();

    const formattedUrl = formatAudioUrl(rawUrl);
    if (!formattedUrl) {
      console.warn('No valid audio URL provided to startCustomAudioUrl');
      return;
    }

    console.log('Fetching and playing custom audio from:', formattedUrl);

    // Primary Method: Fetch arrayBuffer & decode with AudioContext
    try {
      if (this.audioCtx) {
        const response = await fetch(formattedUrl);
        if (response.ok) {
          const arrayBuf = await response.arrayBuffer();
          const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuf);

          if (!this.isPlaying) return;

          this.stopPlayback();
          this.init();
          await this.ensureContextResumed();

          const source = this.audioCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.loop = true;
          if (this.masterGain) {
            source.connect(this.masterGain);
          } else {
            source.connect(this.audioCtx.destination);
          }

          source.start(0);
          this.audioBufferSource = source;
          this.updateEffectiveVolume();
          console.log('Web Audio BufferSource successfully started!');
          return;
        }
      }
    } catch (e) {
      console.warn('Web Audio decodeAudioData notice, falling back to Audio element:', e);
    }

    // Secondary Method: HTML5 Audio Element Fallback
    const audio = new Audio();
    this.audioEl = audio;
    audio.loop = true;
    audio.src = formattedUrl;

    if (this.audioCtx && this.masterGain) {
      try {
        if (this.audioElSource) {
          this.audioElSource.disconnect();
          this.audioElSource = null;
        }
        this.audioElSource = this.audioCtx.createMediaElementSource(audio);
        this.audioElSource.connect(this.masterGain);
      } catch (e) {
        console.warn('MediaElementSource notice:', e);
      }
    }

    this.updateEffectiveVolume();

    audio.play().catch(err => {
      console.warn('HTML5 Audio play error:', err);
    });
  }

  public dispose() {
    this.stopPlayback();
    if (this.masterGain) {
      this.masterGain.disconnect();
    }
  }
}
