import type { Position, AudioDistanceConfig } from '../types/game';

export class SpatialAudioEngine {
  private audioCtx: AudioContext | null = null;
  private localStream: MediaStream | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private isMuted: boolean = true; // Default Microphone OFF on Join

  private remoteAudioNodes: Map<string, {
    source: MediaStreamAudioSourceNode;
    gainNode: GainNode;
    pannerNode: StereoPannerNode | PannerNode;
    element: HTMLAudioElement;
  }> = new Map();

  private config: AudioDistanceConfig = {
    maxDistance: 450, // Pixels cutoff
    minDistance: 80,  // Pixels 100% volume
    rolloffFactor: 2.0 // Exponential attenuation curve
  };

  private talkingCallback?: (isTalking: boolean, volume: number) => void;
  private animationFrameId: number | null = null;

  public async initAudio(): Promise<boolean> {
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Mute audio track by default when joining game
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach((track) => {
          track.enabled = !this.isMuted;
        });
      }

      this.setupLocalAnalyser();
      return true;
    } catch (err) {
      console.warn('Microphone access not granted or unavailable. Visual mic mode fallback active:', err);
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioCtxClass();
      }
      return false;
    }
  }

  private setupLocalAnalyser() {
    if (!this.audioCtx || !this.localStream) return;

    const source = this.audioCtx.createMediaStreamSource(this.localStream);
    this.localAnalyser = this.audioCtx.createAnalyser();
    this.localAnalyser.fftSize = 512;
    source.connect(this.localAnalyser);

    this.startVoiceVolumeMonitoring();
  }

  private startVoiceVolumeMonitoring() {
    const dataArray = new Uint8Array(this.localAnalyser?.frequencyBinCount || 0);

    const checkVolume = () => {
      if (this.localAnalyser && !this.isMuted) {
        this.localAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalizedVolume = Math.min(1, average / 128);
        const isTalking = normalizedVolume > 0.08;

        if (this.talkingCallback) {
          this.talkingCallback(isTalking, normalizedVolume);
        }
      } else {
        if (this.talkingCallback) {
          this.talkingCallback(false, 0);
        }
      }
      this.animationFrameId = requestAnimationFrame(checkVolume);
    };

    checkVolume();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setTalkingCallback(cb: (isTalking: boolean, volume: number) => void) {
    this.talkingCallback = cb;
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public addRemotePeerStream(peerId: string, stream: MediaStream) {
    const ctx = this.audioCtx;
    if (!ctx) return;

    if (this.remoteAudioNodes.has(peerId)) {
      this.removeRemotePeerStream(peerId);
    }

    const audioElement = new Audio();
    audioElement.srcObject = stream;
    audioElement.autoplay = true;

    const source = ctx.createMediaStreamSource(stream);
    const gainNode = ctx.createGain();

    let pannerNode: StereoPannerNode | PannerNode;
    if (typeof (ctx as any).createStereoPanner === 'function') {
      pannerNode = (ctx as any).createStereoPanner();
    } else {
      pannerNode = ctx.createPanner();
    }

    source.connect(gainNode);
    gainNode.connect(pannerNode);
    pannerNode.connect(ctx.destination);

    this.remoteAudioNodes.set(peerId, {
      source,
      gainNode,
      pannerNode,
      element: audioElement
    });
  }

  public removeRemotePeerStream(peerId: string) {
    const nodes = this.remoteAudioNodes.get(peerId);
    if (nodes) {
      nodes.source.disconnect();
      nodes.gainNode.disconnect();
      nodes.pannerNode.disconnect();
      nodes.element.srcObject = null;
      nodes.element.remove();
      this.remoteAudioNodes.delete(peerId);
    }
  }

  public updateRemotePeerPosition(peerId: string, localPos: Position, peerPos: Position) {
    const nodes = this.remoteAudioNodes.get(peerId);
    if (!nodes) return;

    const dx = peerPos.x - localPos.x;
    const dy = peerPos.y - localPos.y;
    const distance = Math.hypot(dx, dy);

    // 1. Calculate Attenuated Distance Volume
    let volume = 0;
    if (distance <= this.config.minDistance) {
      volume = 1;
    } else if (distance >= this.config.maxDistance) {
      volume = 0;
    } else {
      const range = this.config.maxDistance - this.config.minDistance;
      const normalizedDist = (distance - this.config.minDistance) / range;
      volume = Math.pow(1 - normalizedDist, this.config.rolloffFactor);
    }

    nodes.gainNode.gain.setValueAtTime(volume, this.audioCtx?.currentTime || 0);

    // 2. Calculate Stereo Pan (-1 Left to +1 Right)
    const pan = Math.max(-1, Math.min(1, dx / (this.config.maxDistance * 0.75)));
    if ('pan' in nodes.pannerNode) {
      (nodes.pannerNode as StereoPannerNode).pan.setValueAtTime(pan, this.audioCtx?.currentTime || 0);
    }
  }

  public getConfig(): AudioDistanceConfig {
    return this.config;
  }

  public dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.remoteAudioNodes.forEach((_, peerId) => this.removeRemotePeerStream(peerId));
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
    }
    if (this.audioCtx) {
      this.audioCtx.close();
    }
  }
}
