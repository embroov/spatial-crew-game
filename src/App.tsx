import { useState, useEffect, useRef } from 'react';
import type { Player, ChatMessage, EmoteNotification, Position } from './types/game';
import { GameMap } from './engine/GameMap';
import { SpatialAudioEngine } from './engine/SpatialAudioEngine';
import { SocketService, type PublicRoomInfo } from './services/SocketService';
import { DJMusicEngine, DJMusicState, PRESET_TRACKS } from './engine/DJMusicEngine';
import { ServerLobby } from './components/Lobby/ServerLobby';
import { GameCanvas } from './components/Game/GameCanvas';
import { AudioControlsBar } from './components/UI/AudioControlsBar';
import { Minimap } from './components/UI/Minimap';
import { ChatAndPlayers } from './components/UI/ChatAndPlayers';
import { DJControlPanel } from './components/UI/DJControlPanel';

export function App() {
  const [inGame, setInGame] = useState(false);
  const [roomCode, setRoomCode] = useState('ROOM-1');
  const [showAudioRadius, setShowAudioRadius] = useState(true);

  // Public server rooms list with live player counts
  const [publicRooms, setPublicRooms] = useState<PublicRoomInfo[]>([]);

  // UI state for hotkeys & modals
  const [chatOpen, setChatOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [emoteOpen, setEmoteOpen] = useState(false);
  const [djConsoleOpen, setDjConsoleOpen] = useState(false);
  const [hideCursor, setHideCursor] = useState(false);

  // DJ State
  const [djState, setDjState] = useState<DJMusicState>({
    isPlaying: false,
    trackId: PRESET_TRACKS[0]?.id || 'default_track',
    trackName: PRESET_TRACKS[0]?.name || 'Select a Track',
    djName: 'Automated DJ',
    startedAt: Date.now(),
  });

  const [localPlayer, setLocalPlayer] = useState<Player>({
    id: Math.random().toString(36).substring(2, 9),
    name: 'Crewmate',
    color: '#84cc16',
    position: { ...GameMap.SPAWN_POS },
    facingAngle: 0,
    isMuted: true, // Default Microphone OFF on Join
    isTalking: false,
    audioVolume: 0,
    room: 'Central Cyber Plaza',
  });

  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Engine & Service singletons
  const audioEngineRef = useRef<SpatialAudioEngine>(new SpatialAudioEngine());
  const djEngineRef = useRef<DJMusicEngine>(new DJMusicEngine());
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

  // Global Hotkey listener for '/' (Chat), 'M' (Map), 'U' (Mic), 'E' (Emotes), 'Escape'
  useEffect(() => {
    if (!inGame) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInput = ['input', 'textarea'].includes(activeTag);

      if (e.key === 'Escape') {
        setChatOpen(false);
        setMapOpen(false);
        setEmoteOpen(false);
        (document.activeElement as HTMLElement)?.blur();
        return;
      }

      if (isInput) return; // Do not trigger hotkeys when typing in chat

      const key = e.key.toLowerCase();

      if (key === '/') {
        e.preventDefault();
        setChatOpen((prev) => !prev);
      } else if (key === 'm') {
        e.preventDefault();
        setMapOpen((prev) => !prev);
      } else if (key === 'u') {
        e.preventDefault();
        handleToggleMute();
      } else if (key === 'y') {
        e.preventDefault();
        setEmoteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [inGame]);

  const handleJoinGame = async (name: string, color: string, code: string) => {
    setRoomCode(code);

    // Explicitly set microphone to MUTED (OFF) on join
    audioEngineRef.current.setMuted(true);

    const newLocalPlayer: Player = {
      ...localPlayer,
      name,
      color,
      isMuted: true, // Default Microphone OFF
      position: { ...GameMap.SPAWN_POS },
    };
    setLocalPlayer(newLocalPlayer);

    socketServiceRef.current.setEventHandlers({
      onPublicRoomsUpdate: (roomsList) => {
        setPublicRooms(roomsList);
      },
      onPlayersUpdate: (updatedPlayers) => {
        setPlayers((prevPlayers) => {
          const now = Date.now();
          return updatedPlayers.map((newP) => {
            const existing = prevPlayers.find((p) => p.id === newP.id);
            if (existing?.activeEmote && existing.activeEmote.expiresAt > now) {
              return { ...newP, activeEmote: existing.activeEmote };
            }
            return { ...newP, activeEmote: undefined };
          });
        });
      },
      onChatMessage: (msg: ChatMessage) => {
        setMessages((prev) => [...prev.slice(-49), msg]);
      },
      onEmoteReceived: (emote: EmoteNotification) => {
        const now = Date.now();
        const expiresAt = emote.emoji ? now + 3000 : 0;

        setPlayers((prev) =>
          prev.map((p) => (p.id === emote.playerId ? { ...p, activeEmote: emote.emoji ? { emoji: emote.emoji, expiresAt } : undefined } : p))
        );
      },
      onDjStateUpdate: (incomingDjState: DJMusicState) => {
        setDjState(incomingDjState);
        if (incomingDjState.isPlaying) {
          djEngineRef.current.playTrack(
            incomingDjState.trackId,
            incomingDjState.customUrl,
            incomingDjState.djName,
            incomingDjState.startedAt
          );
        } else {
          djEngineRef.current.pauseTrack();
        }
      },
    });

    socketServiceRef.current.joinRoom(newLocalPlayer, code);
    setInGame(true);
  };

  const handleUpdateDjState = (newState: DJMusicState) => {
    setDjState(newState);
    if (newState.isPlaying) {
      djEngineRef.current.playTrack(
        newState.trackId,
        newState.customUrl,
        newState.djName,
        newState.startedAt
      );
    } else {
      djEngineRef.current.pauseTrack();
    }
    socketServiceRef.current.updateDjState(newState);
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
    const now = Date.now();
    const currentEmote = localPlayer.activeEmote;
    const isSameActive = currentEmote && currentEmote.emoji === emoji && currentEmote.expiresAt > now;

    if (isSameActive) {
      setLocalPlayer((prev) => ({
        ...prev,
        activeEmote: undefined,
      }));
      setPlayers((prev) =>
        prev.map((p) => (p.id === localPlayer.id ? { ...p, activeEmote: undefined } : p))
      );
      socketServiceRef.current.sendEmote('');
    } else {
      const expiresAt = now + 3000;
      const newEmoteObj = { emoji, expiresAt };

      setLocalPlayer((prev) => ({
        ...prev,
        activeEmote: newEmoteObj,
      }));
      setPlayers((prev) =>
        prev.map((p) => (p.id === localPlayer.id ? { ...p, activeEmote: newEmoteObj } : p))
      );
      socketServiceRef.current.sendEmote(emoji);
    }
  };

  const handleLeaveServer = () => {
    djEngineRef.current.stopPlayback();
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
            djEngine={djEngineRef.current}
            djState={djState}
            onOpenDjConsole={() => setDjConsoleOpen(true)}
            onPositionUpdate={handlePositionUpdate}
            showAudioRadius={showAudioRadius}
            hideCursor={hideCursor}
            onToggleHideCursor={() => setHideCursor((prev) => !prev)}
            onSendEmote={handleSendEmote}
            showEmotePicker={emoteOpen}
            onToggleEmotePicker={() => setEmoteOpen((prev) => !prev)}
          />

          {/* DJ Control Console Modal */}
          {djConsoleOpen && (
            <DJControlPanel
              djEngine={djEngineRef.current}
              djState={djState}
              localPlayerName={localPlayer.name}
              onUpdateState={handleUpdateDjState}
              onClose={() => setDjConsoleOpen(false)}
            />
          )}

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
