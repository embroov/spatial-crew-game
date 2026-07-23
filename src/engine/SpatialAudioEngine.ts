import type { Position, AudioDistanceConfig } from '../types/game';

export class SpatialAudioEngine {
  private audioCtx: AudioContext | null = null;
  private localStream: MediaStream | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private isMuted: boolean = false;

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

    const bufferLength = this.localAnalyser.frequencyBinCount;
    const timeDomainData = new Uint8Array(bufferLength);

    const checkVolume = () => {
      if (!this.localAnalyser || this.isMuted) {
        if (this.talkingCallback) this.talkingCallback(false, 0);
      } else {
        // RMS (Root Mean Square) volume calculation on time-domain waveform
        this.localAnalyser.getByteTimeDomainData(timeDomainData);
        let sumSquares = 0;
        for (let i = 0; i < bufferLength; i++) {
          const norm = (timeDomainData[i] - 128) / 128;
          sumSquares += norm * norm;
        }
        const rms = Math.sqrt(sumSquares / bufferLength);
        
        // Dynamic gain multiplier sensitive for laptop built-in mics
        const normalizedVolume = Math.min(1.0, rms * 6);
        const isTalking = normalizedVolume > 0.03;

        if (this.talkingCallback) {
          this.talkingCallback(isTalking, normalizedVolume);
        }
      }
      this.animationFrameId = requestAnimationFrame(checkVolume);
    };

    checkVolume();
  }

  public setTalkingCallback(cb: (isTalking: boolean, volume: number) => void) {
    this.talkingCallback = cb;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public addRemotePeerStream(peerId: string, stream: MediaStream) {
    if (!this.audioCtx) return;

    this.removeRemotePeerStream(peerId);

    const audioEl = new Audio();
    audioEl.srcObject = stream;
    audioEl.autoplay = true;
    audioEl.muted = true;

    const source = this.audioCtx.createMediaStreamSource(stream);
    const gainNode = this.audioCtx.createGain();
    gainNode.gain.value = 0;

    let pannerNode: StereoPannerNode | PannerNode;

    if ('createStereoPanner' in (this.audioCtx as object)) {
      pannerNode = this.audioCtx.createStereoPanner();
      pannerNode.pan.value = 0;
    } else {
      const panner = (this.audioCtx as AudioContext).createPanner();
      panner.panningModel = 'HRTF';
      pannerNode = panner;
    }

    source.connect(gainNode);
    gainNode.connect(pannerNode);
    pannerNode.connect(this.audioCtx.destination);

    this.remoteAudioNodes.set(peerId, {
      source,
      gainNode,
      pannerNode,
      element: audioEl
    });
  }

  public updateRemotePeerPosition(peerId: string, localPos: Position, remotePos: Position) {
    const node = this.remoteAudioNodes.get(peerId);
    if (!node || !this.audioCtx) return;

    const dx = remotePos.x - localPos.x;
    const dy = remotePos.y - localPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let gain = 0;
    if (distance <= this.config.minDistance) {
      gain = 1.0;
    } else if (distance >= this.config.maxDistance) {
      gain = 0.0;
    } else {
      const normalizedDist = (distance - this.config.minDistance) / (this.config.maxDistance - this.config.minDistance);
      gain = Math.pow(1.0 - normalizedDist, this.config.rolloffFactor);
    }

    node.gainNode.gain.setTargetAtTime(gain, this.audioCtx.currentTime, 0.05);

    if ('pan' in node.pannerNode) {
      const maxPanDist = 350;
      const panValue = Math.max(-1.0, Math.min(1.0, dx / maxPanDist));
      (node.pannerNode as StereoPannerNode).pan.setTargetAtTime(panValue, this.audioCtx.currentTime, 0.05);
    }
  }

  public removeRemotePeerStream(peerId: string) {
    const node = this.remoteAudioNodes.get(peerId);
    if (node) {
      node.source.disconnect();
      node.gainNode.disconnect();
      node.pannerNode.disconnect();
      node.element.srcObject = null;
      this.remoteAudioNodes.delete(peerId);
    }
  }

  public updateConfig(newConfig: Partial<AudioDistanceConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): AudioDistanceConfig {
    return this.config;
  }

  public dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.remoteAudioNodes.forEach((_, id) => this.removeRemotePeerStream(id));
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }
  }
}
