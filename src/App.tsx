import { useState, useEffect, useRef } from 'react';
import type { Player, ChatMessage, EmoteNotification, Position } from './types/game';
import { GameMap } from './engine/GameMap';
import { SpatialAudioEngine } from './engine/SpatialAudioEngine';
import { SocketService, type PublicRoomInfo } from './services/SocketService';
import { ServerLobby } from './components/Lobby/ServerLobby';
import { GameCanvas } from './components/Game/GameCanvas';
import { AudioControlsBar } from './components/UI/AudioControlsBar';
import { Minimap } from './components/UI/Minimap';
import { ChatAndPlayers } from './components/UI/ChatAndPlayers';

export function App() {
  const [inGame, setInGame] = useState(false);
  const [roomCode, setRoomCode] = useState('ROOM-1');
  const [showAudioRadius, setShowAudioRadius] = useState(true);

  // Public server rooms list with live player counts
  const [publicRooms, setPublicRooms] = useState<PublicRoomInfo[]>([]);

  // UI state for hotkeys
  const [chatOpen, setChatOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [hideCursor, setHideCursor] = useState(false);

  const [localPlayer, setLocalPlayer] = useState<Player>({
    id: Math.random().toString(36).substring(2, 9),
    name: 'Crewmate',
    color: '#84cc16',
    position: { ...GameMap.SPAWN_POS },
    facingAngle: 0,
    isMuted: false,
    isTalking: false,
    audioVolume: 0,
    room: 'Grand Plaza',
  });

  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Engine & Service singletons
  const audioEngineRef = useRef<SpatialAudioEngine>(new SpatialAudioEngine());
  const socketServiceRef = useRef<SocketService>(new SocketService());

  const handleToggleMute = () => {
    const currentMute = audioEngineRef.current.getIsMuted();
    const nextMute = !currentMute;
    audioEngineRef.current.setMuted(nextMute);
    setLocalPlayer((prev) => {
      socketServiceRef.current.updateAudioState(nextMute, prev.isTalking);
      return { ...prev, isMuted: nextMute };
    });
  };

  useEffect(() => {
    const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    
    socketServiceRef.current.setAudioEngine(audioEngineRef.current);
    socketServiceRef.current.setEventHandlers({
      onPublicRoomsUpdate: (roomsList) => {
        setPublicRooms(roomsList);
      },
    });

    socketServiceRef.current.connect(SERVER_URL);

    audioEngineRef.current.setTalkingCallback((isTalking, volume) => {
      setLocalPlayer((prev) => {
        if (prev.isTalking !== isTalking || Math.abs(prev.audioVolume - volume) > 0.05) {
          socketServiceRef.current.updateAudioState(prev.isMuted, isTalking);
          return { ...prev, isTalking, audioVolume: volume };
        }
        return prev;
      });
    });

    return () => {
      audioEngineRef.current.dispose();
      socketServiceRef.current.disconnect();
    };
  }, []);

  // Hotkey listener for '/' (Chat), 'M' (Map), 'U' (Mic), 'Escape'
  useEffect(() => {
    if (!inGame) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInput = ['input', 'textarea'].includes(activeTag);

      if (e.key === 'Escape') {
        setChatOpen(false);
        setMapOpen(false);
        (document.activeElement as HTMLElement)?.blur();
        return;
      }

      if (isInput) return; // Do not trigger hotkeys when typing in chat

      if (e.key === '/') {
        e.preventDefault();
        setChatOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setMapOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'u') {
        e.preventDefault();
        handleToggleMute();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [inGame]);

  const handleJoinGame = async (name: string, color: string, code: string) => {
    setRoomCode(code);

    const newLocalPlayer: Player = {
      ...localPlayer,
      name,
      color,
      position: { ...GameMap.SPAWN_POS },
    };
    setLocalPlayer(newLocalPlayer);

    socketServiceRef.current.setEventHandlers({
      onPublicRoomsUpdate: (roomsList) => {
        setPublicRooms(roomsList);
      },
      onPlayersUpdate: (updatedPlayers) => {
        setPlayers(updatedPlayers);
      },
      onChatMessage: (msg: ChatMessage) => {
        setMessages((prev) => [...prev.slice(-49), msg]);
      },
      onEmoteReceived: (_emote: EmoteNotification) => {
        // Rendered directly on Canvas
      },
    });

    socketServiceRef.current.joinRoom(newLocalPlayer, code);
    setInGame(true);
  };

  const handlePositionUpdate = (pos: Position, angle: number) => {
    setLocalPlayer((prev) => ({
      ...prev,
      position: pos,
      facingAngle: angle,
    }));
    socketServiceRef.current.updatePosition(pos, angle);
  };

  const handleSendMessage = (text: string) => {
    socketServiceRef.current.sendChatMessage(text);
  };

  const handleSendEmote = (emoji: string) => {
    socketServiceRef.current.sendEmote(emoji);
  };

  const handleLeaveServer = () => {
    socketServiceRef.current.disconnect();
    setInGame(false);
  };

  return (
    <div className={`w-full bg-slate-950 text-slate-100 font-sans ${inGame ? 'w-screen h-screen overflow-hidden' : 'min-h-screen overflow-y-auto'}`}>
      {!inGame ? (
        <ServerLobby
          onJoin={handleJoinGame}
          audioEngine={audioEngineRef.current}
          publicRooms={publicRooms}
        />
      ) : (
        <div className="relative w-full h-full">
          {/* 60 FPS 2D Game Canvas */}
          <GameCanvas
            localPlayer={localPlayer}
            players={players}
            audioEngine={audioEngineRef.current}
            onPositionUpdate={handlePositionUpdate}
            showAudioRadius={showAudioRadius}
            hideCursor={hideCursor}
            onToggleHideCursor={() => setHideCursor((prev) => !prev)}
          />

          {/* Minimap View */}
          <Minimap
            localPlayer={localPlayer}
            players={players}
            isOpen={mapOpen}
            onToggle={() => setMapOpen((prev) => !prev)}
          />

          {/* Chat & Crew Roster Panel */}
          <ChatAndPlayers
            localPlayer={localPlayer}
            players={players}
            messages={messages}
            maxAudioDistance={audioEngineRef.current.getConfig().maxDistance}
            isOpen={chatOpen}
            onToggle={() => setChatOpen((prev) => !prev)}
            onSendMessage={handleSendMessage}
            onSendEmote={handleSendEmote}
          />

          {/* HUD Audio Controls Bar */}
          <AudioControlsBar
            audioEngine={audioEngineRef.current}
            isMuted={localPlayer.isMuted}
            onToggleMute={handleToggleMute}
            roomCode={roomCode}
            showRadius={showAudioRadius}
            onToggleRadius={() => setShowAudioRadius(!showAudioRadius)}
            onLeave={handleLeaveServer}
          />
        </div>
      )}
    </div>
  );
}

export default App;
