export interface Position {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  position: Position;
  targetPosition?: Position; // For smooth interpolation
  facingAngle: number; // Angle in radians
  isMuted: boolean;
  isTalking: boolean;
  audioVolume: number; // 0 to 1 current mic input level
  room: string;
  hat?: string;
  activeEmote?: {
    emoji: string;
    expiresAt: number;
  };
}

export interface Room {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  isPrivate: boolean;
}

export interface MapWall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MapRoomZone {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface EmoteNotification {
  id: string;
  playerId: string;
  emoji: string;
  timestamp: number;
}

export interface AudioDistanceConfig {
  maxDistance: number; // Pixels beyond which voice cuts off completely
  minDistance: number; // Pixels within which voice is at 100% volume
  rolloffFactor: number; // Curve exponential factor
}
