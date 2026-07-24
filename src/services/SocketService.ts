import { io, Socket } from 'socket.io-client';
import type { Player, Position, ChatMessage, EmoteNotification } from '../types/game';
import type { SpatialAudioEngine } from '../engine/SpatialAudioEngine';

export interface PublicRoomInfo {
  id: string;
  name: string;
  count: number;
  maxPlayers: number;
}

export type NetworkEventHandler = {
  onPlayersUpdate?: (players: Player[]) => void;
  onPlayerJoined?: (player: Player) => void;
  onPlayerLeft?: (id: string) => void;
  onChatMessage?: (msg: ChatMessage) => void;
  onEmoteReceived?: (emote: EmoteNotification) => void;
  onPublicRoomsUpdate?: (rooms: PublicRoomInfo[]) => void;
};

export class SocketService {
  private socket: Socket | null = null;
  private localPlayer: Player | null = null;
  private playersMap: Map<string, Player> = new Map();
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private audioEngine: SpatialAudioEngine | null = null;
  private handlers: NetworkEventHandler = {};
  private roomId: string = 'ROOM-1';

  private iceServers: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  public setAudioEngine(engine: SpatialAudioEngine) {
    this.audioEngine = engine;
  }

  public connect(serverUrl: string = 'http://localhost:3001'): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.socket = io(serverUrl, {
          transports: ['websocket', 'polling'],
          timeout: 4000,
          reconnectionAttempts: 3
        });

        this.socket.on('socket_id', (id: string) => {
          if (this.localPlayer) {
            const oldId = this.localPlayer.id;
            this.playersMap.delete(oldId);
            this.localPlayer.id = id;
            this.playersMap.set(id, this.localPlayer);
          }
        });

        this.socket.on('connect', () => {
          console.log('Connected to Socket.io Server:', this.socket?.id);
          this.registerSocketEvents();
          this.socket?.emit('get_public_rooms');
          resolve(true);
        });

        this.socket.on('connect_error', () => {
          console.warn('Socket server unavailable. Local standalone mode active.');
          resolve(true);
        });
      } catch (err) {
        console.warn('Socket connection error:', err);
        resolve(true);
      }
    });
  }

  private registerSocketEvents() {
    if (!this.socket) return;

    this.socket.on('public_rooms_update', (roomsList: PublicRoomInfo[]) => {
      if (this.handlers.onPublicRoomsUpdate) {
        this.handlers.onPublicRoomsUpdate(roomsList);
      }
    });

    this.socket.on('room_state', (playersList: Player[]) => {
      this.playersMap.clear();

      playersList.forEach((p) => {
        this.playersMap.set(p.id, p);

        if (this.localPlayer && p.id !== this.localPlayer.id) {
          this.initiateWebRTCConnection(p.id, true);
        }
      });

      if (this.localPlayer) {
        this.playersMap.set(this.localPlayer.id, this.localPlayer);
      }

      if (this.handlers.onPlayersUpdate) {
        this.handlers.onPlayersUpdate(Array.from(this.playersMap.values()));
      }
    });

    this.socket.on('player_joined', (player: Player) => {
      if (this.localPlayer && player.id === this.localPlayer.id) return;

      this.playersMap.set(player.id, player);

      if (this.localPlayer) {
        this.initiateWebRTCConnection(player.id, false);
      }

      if (this.handlers.onPlayerJoined) this.handlers.onPlayerJoined(player);
      if (this.handlers.onPlayersUpdate) {
        this.handlers.onPlayersUpdate(Array.from(this.playersMap.values()));
      }
    });

    this.socket.on('player_moved', (data: { id: string; position: Position; facingAngle: number }) => {
      const p = this.playersMap.get(data.id);
      if (p) {
        p.position = data.position;
        p.facingAngle = data.facingAngle;
        if (this.handlers.onPlayersUpdate) {
          this.handlers.onPlayersUpdate(Array.from(this.playersMap.values()));
        }
      }
    });

    this.socket.on('player_audio_state', (data: { id: string; isMuted: boolean; isTalking: boolean }) => {
      const p = this.playersMap.get(data.id);
      if (p) {
        p.isMuted = data.isMuted;
        p.isTalking = data.isTalking;
        if (this.handlers.onPlayersUpdate) {
          this.handlers.onPlayersUpdate(Array.from(this.playersMap.values()));
        }
      }
    });

    this.socket.on('player_left', (id: string) => {
      this.closeWebRTCConnection(id);
      this.playersMap.delete(id);
      if (this.handlers.onPlayerLeft) this.handlers.onPlayerLeft(id);
      if (this.handlers.onPlayersUpdate) {
        this.handlers.onPlayersUpdate(Array.from(this.playersMap.values()));
      }
    });

    this.socket.on('chat_message', (msg: ChatMessage) => {
      if (this.handlers.onChatMessage) this.handlers.onChatMessage(msg);
    });

    this.socket.on('emote_received', (emote: EmoteNotification) => {
      if (this.handlers.onEmoteReceived) this.handlers.onEmoteReceived(emote);
    });

    this.socket.on('webrtc_signal', ({ fromId, signal }: { fromId: string; signal: any }) => {
      this.handleWebRTCSignal(fromId, signal);
    });
  }

  // --- WebRTC Spatial Audio Peer Connections ---

  private async initiateWebRTCConnection(peerId: string, isOfferInitiator: boolean) {
    if (this.peerConnections.has(peerId)) return;

    const pc = new RTCPeerConnection(this.iceServers);
    this.peerConnections.set(peerId, pc);

    const localStream = this.audioEngine?.getLocalStream();
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0] && this.audioEngine) {
        console.log(`[WebRTC] Received remote audio stream from peer ${peerId}`);
        this.audioEngine.addRemotePeerStream(peerId, event.streams[0]);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('webrtc_signal', {
          targetId: peerId,
          signal: { type: 'candidate', candidate: event.candidate }
        });
      }
    };

    if (isOfferInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (this.socket) {
          this.socket.emit('webrtc_signal', {
            targetId: peerId,
            signal: { type: 'offer', sdp: pc.localDescription }
          });
        }
      } catch (err) {
        console.error(`[WebRTC] Error creating offer for peer ${peerId}:`, err);
      }
    }
  }

  private async handleWebRTCSignal(fromId: string, signal: any) {
    let pc = this.peerConnections.get(fromId);
    if (!pc) {
      await this.initiateWebRTCConnection(fromId, false);
      pc = this.peerConnections.get(fromId);
    }

    if (!pc) return;

    try {
      if (signal.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (this.socket) {
          this.socket.emit('webrtc_signal', {
            targetId: fromId,
            signal: { type: 'answer', sdp: pc.localDescription }
          });
        }
      } else if (signal.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      } else if (signal.type === 'candidate') {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (err) {
      console.error(`[WebRTC] Error handling signal from ${fromId}:`, err);
    }
  }

  private closeWebRTCConnection(peerId: string) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
    if (this.audioEngine) {
      this.audioEngine.removeRemotePeerStream(peerId);
    }
  }

  // --- Public API ---

  public joinRoom(player: Player, roomCode: string = 'ROOM-1') {
    this.roomId = roomCode;
    this.playersMap.clear();

    if (this.socket && this.socket.id) {
      player.id = this.socket.id;
    }

    this.localPlayer = player;
    this.playersMap.set(player.id, player);

    if (this.handlers.onPlayersUpdate) {
      this.handlers.onPlayersUpdate(Array.from(this.playersMap.values()));
    }

    if (this.socket && this.socket.connected) {
      this.socket.emit('join_room', { player, roomId: roomCode });
    }
  }

  public updatePosition(position: Position, facingAngle: number) {
    if (!this.localPlayer) return;
    this.localPlayer.position = position;
    this.localPlayer.facingAngle = facingAngle;
    this.playersMap.set(this.localPlayer.id, this.localPlayer);

    if (this.socket && this.socket.connected) {
      this.socket.emit('update_position', { position, facingAngle });
    }

    if (this.handlers.onPlayersUpdate) {
      this.handlers.onPlayersUpdate(Array.from(this.playersMap.values()));
    }
  }

  public updateAudioState(isMuted: boolean, isTalking: boolean) {
    if (!this.localPlayer) return;
    this.localPlayer.isMuted = isMuted;
    this.localPlayer.isTalking = isTalking;
    this.playersMap.set(this.localPlayer.id, this.localPlayer);

    if (this.socket && this.socket.connected) {
      this.socket.emit('update_audio_state', { isMuted, isTalking });
    }

    if (this.handlers.onPlayersUpdate) {
      this.handlers.onPlayersUpdate(Array.from(this.playersMap.values()));
    }
  }

  public sendChatMessage(text: string): ChatMessage {
    const msg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      senderId: this.localPlayer?.id || 'unknown',
      senderName: this.localPlayer?.name || 'Player',
      senderColor: this.localPlayer?.color || '#3b82f6',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (this.socket && this.socket.connected) {
      this.socket.emit('send_chat', msg);
    }
    return msg;
  }

  public sendEmote(emoji: string): EmoteNotification {
    const emote: EmoteNotification = {
      id: Math.random().toString(36).substring(2, 9),
      playerId: this.localPlayer?.id || 'unknown',
      emoji,
      timestamp: Date.now()
    };

    if (this.socket && this.socket.connected) {
      this.socket.emit('send_emote', emote);
    }
    return emote;
  }

  public setEventHandlers(handlers: NetworkEventHandler) {
    this.handlers = handlers;
  }

  public getPlayers(): Player[] {
    return Array.from(this.playersMap.values());
  }

  public disconnect() {
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
