import React, { useEffect, useRef, useState } from 'react';
import type { Player, Position } from '../../types/game';
import { GameMap } from '../../engine/GameMap';
import type { SpatialAudioEngine } from '../../engine/SpatialAudioEngine';
import { Smile, X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface GameCanvasProps {
  localPlayer: Player;
  players: Player[];
  audioEngine: SpatialAudioEngine;
  onPositionUpdate: (pos: Position, angle: number) => void;
  showAudioRadius: boolean;
  hideCursor: boolean;
  onToggleHideCursor: () => void;
  onSendEmote: (emoji: string) => void;
  showEmotePicker: boolean;
  onToggleEmotePicker: () => void;
}

const AVAILABLE_EMOTES = [
  { emoji: '👋', name: 'Wave', hotkey: '1' },
  { emoji: '💃', name: 'Dance', hotkey: '2' },
  { emoji: '❤️', name: 'Love', hotkey: '3' },
  { emoji: '😂', name: 'Laugh', hotkey: '4' },
  { emoji: '👍', name: 'Thumbs Up', hotkey: '5' },
  { emoji: '🔥', name: 'Fire', hotkey: '6' },
  { emoji: '⚡', name: 'Hype', hotkey: '7' },
  { emoji: '👏', name: 'Clap', hotkey: '8' },
  { emoji: '🎉', name: 'Party', hotkey: '9' },
];

export const GameCanvas: React.FC<GameCanvasProps> = ({
  localPlayer,
  players,
  audioEngine,
  onPositionUpdate,
  showAudioRadius,
  hideCursor,
  onToggleHideCursor,
  onSendEmote,
  showEmotePicker,
  onToggleEmotePicker,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const posRef = useRef<Position>({ ...localPlayer.position });
  const angleRef = useRef<number>(localPlayer.facingAngle);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const walkDistanceRef = useRef<number>(0);

  const [currentRoom, setCurrentRoom] = useState<string>('Central Cyber Plaza');
  const [isSprintingState, setIsSprintingState] = useState<boolean>(false);
  const [zoomScale, setZoomScale] = useState<number>(1.0);

  const handleZoomIn = () => setZoomScale((prev) => Math.min(1.6, Math.round((prev + 0.15) * 100) / 100));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(0.5, Math.round((prev - 0.15) * 100) / 100));
  const handleResetZoom = () => setZoomScale(1.0);

  // Sync position ref when local player joins or respawns
  useEffect(() => {
    posRef.current = { ...localPlayer.position };
  }, [localPlayer.id]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  // Mouse Wheel Zoom & Middle Click listeners
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        onToggleHideCursor();
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onToggleHideCursor]);

  // WASD, Arrow Key, Shift Sprint & Hotkeys listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (['input', 'textarea'].includes(activeTag)) return;

      const key = e.key.toLowerCase();
      const code = e.code;

      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(key) ||
          ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(code)) {
        if (key !== 'shift' && code !== 'ShiftLeft' && code !== 'ShiftRight') {
          e.preventDefault();
        }
      }

      keysRef.current[key] = true;
      keysRef.current[code] = true;

      if (key === 'shift' || code === 'ShiftLeft' || code === 'ShiftRight') {
        setIsSprintingState(true);
      }

      if (key === '=' || key === '+') {
        handleZoomIn();
      } else if (key === '-' || key === '_') {
        handleZoomOut();
      } else if (key === '0') {
        handleResetZoom();
      }

      // Number keys 1-9 for instant emote
      if (/^[1-9]$/.test(key)) {
        const index = parseInt(key, 10) - 1;
        if (AVAILABLE_EMOTES[index]) {
          onSendEmote(AVAILABLE_EMOTES[index].emoji);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const code = e.code;
      keysRef.current[key] = false;
      keysRef.current[code] = false;

      if (key === 'shift' || code === 'ShiftLeft' || code === 'ShiftRight') {
        setIsSprintingState(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onSendEmote]);

  // Main 60 FPS Game Loop with Camera POV Zoom
  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const baseSpeed = 320;
    const sprintSpeed = 580;

    const render = (now: number) => {
      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      let dx = 0;
      let dy = 0;

      if (keysRef.current['w'] || keysRef.current['KeyW'] || keysRef.current['arrowup'] || keysRef.current['ArrowUp']) dy -= 1;
      if (keysRef.current['s'] || keysRef.current['KeyS'] || keysRef.current['arrowdown'] || keysRef.current['ArrowDown']) dy += 1;
      if (keysRef.current['a'] || keysRef.current['KeyA'] || keysRef.current['arrowleft'] || keysRef.current['ArrowLeft']) dx -= 1;
      if (keysRef.current['d'] || keysRef.current['KeyD'] || keysRef.current['arrowright'] || keysRef.current['ArrowRight']) dx += 1;

      const isSprinting = keysRef.current['shift'] || keysRef.current['ShiftLeft'] || keysRef.current['ShiftRight'];
      const currentSpeed = isSprinting ? sprintSpeed : baseSpeed;

      const isMoving = dx !== 0 || dy !== 0;

      if (isMoving) {
        const length = Math.hypot(dx, dy);
        const moveX = (dx / length) * currentSpeed * delta;
        const moveY = (dy / length) * currentSpeed * delta;

        angleRef.current = Math.atan2(dy, dx);
        walkDistanceRef.current += Math.hypot(moveX, moveY);

        let nextX = posRef.current.x + moveX;
        let nextY = posRef.current.y + moveY;

        if (!GameMap.checkCollision(nextX, posRef.current.y)) {
          posRef.current.x = nextX;
        }
        if (!GameMap.checkCollision(posRef.current.x, nextY)) {
          posRef.current.y = nextY;
        }

        onPositionUpdate({ x: posRef.current.x, y: posRef.current.y }, angleRef.current);

        const room = GameMap.getCurrentRoom(posRef.current.x, posRef.current.y);
        setCurrentRoom(room);
      }

      const config = audioEngine.getConfig();
      players.forEach((p) => {
        if (p.id !== localPlayer.id) {
          audioEngine.updateRemotePeerPosition(p.id, posRef.current, p.position);
        }
      });

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = (canvas.width = window.innerWidth);
          const height = (canvas.height = window.innerHeight);

          ctx.fillStyle = '#030712';
          ctx.fillRect(0, 0, width, height);

          // Apply POV Camera Scale Transform
          const camX = width / (2 * zoomScale) - posRef.current.x;
          const camY = height / (2 * zoomScale) - posRef.current.y;

          ctx.save();
          ctx.scale(zoomScale, zoomScale);
          ctx.translate(camX, camY);

          // 1. Grid Cyber Floor Base
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1;
          const gridSize = 100;
          for (let x = 0; x < GameMap.MAP_WIDTH; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, GameMap.MAP_HEIGHT);
            ctx.stroke();
          }
          for (let y = 0; y < GameMap.MAP_HEIGHT; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(GameMap.MAP_WIDTH, y);
            ctx.stroke();
          }

          // 2. Cobblestone Roads & Pedestrian Walkways (Connecting all rooms)
          drawRoads(ctx);

          // 3. Render Rooms Floors & Custom Props
          for (const room of GameMap.ROOMS) {
            ctx.fillStyle = room.color;
            ctx.fillRect(room.x, room.y, room.width, room.height);

            // Glowing Room Border Outline
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
            ctx.lineWidth = 3;
            ctx.strokeRect(room.x, room.y, room.width, room.height);

            // Room Title Label
            ctx.fillStyle = 'rgba(226, 232, 240, 0.4)';
            ctx.font = 'bold 28px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(room.name.toUpperCase(), room.x + room.width / 2, room.y + 70);

            // Render Room-Specific Rich Furniture & Environmental Props
            if (room.name === 'DJ Stage & Dance Floor') {
              drawDJStageProps(ctx, room, now);
            } else if (room.name === 'VIP Skylounge & Bar') {
              drawVIPBarProps(ctx, room);
            } else if (room.name === 'Neon Arcade & Gaming') {
              drawArcadeProps(ctx, room);
            } else if (room.name === 'Courtyard Stage') {
              drawOutdoorStageProps(ctx, room, now);
            } else if (room.name === 'Sunset Terrace Café') {
              drawCafeProps(ctx, room);
            } else if (room.name === 'Rooftop Observatory') {
              drawObservatoryProps(ctx, room);
            } else if (room.name === 'Zen Chill Lounge') {
              drawZenLoungeProps(ctx, room);
            }
          }

          // 4. Central Fountain Monument with Water Jets
          drawCentralFountain(ctx, now);

          // 5. Environmental Trees, Palm Trees & Street Lamp Posts
          drawEnvironmentalTreesAndLamps(ctx);

          // 6. Wall Partitions & Glowing Entry Doorways
          for (const wall of GameMap.WALLS) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(wall.x, wall.y, wall.width, wall.height);

            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
          }

          // Doorway Entry Arch Indicators
          const doorPads = [
            { name: "VIP Bar Entry", x: 750, y: 1070, w: 350, h: 30 },
            { name: "Observatory Entry", x: 3850, y: 1070, w: 350, h: 30 },
            { name: "Zen Chill Entry", x: 2300, y: 820, w: 400, h: 30 },
            { name: "Arcade Entry", x: 1470, y: 1650, w: 30, h: 300 },
            { name: "DJ Stage Entry", x: 3500, y: 1650, w: 30, h: 300 },
            { name: "Café Entry", x: 800, y: 2500, w: 300, h: 30 },
            { name: "Courtyard Entry", x: 2300, y: 2400, w: 400, h: 30 },
            { name: "Chat Pods Entry", x: 3850, y: 2500, w: 350, h: 30 }
          ];

          for (const pad of doorPads) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
            ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
            ctx.strokeStyle = '#34d399';
            ctx.lineWidth = 2;
            ctx.strokeRect(pad.x, pad.y, pad.w, pad.h);

            ctx.fillStyle = '#6ee7b7';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🚪 OPEN ENTRY', pad.x + pad.w / 2, pad.y + pad.h / 2 + 4);
          }

          // Spatial Audio Proximity Range Ring
          if (showAudioRadius) {
            ctx.beginPath();
            ctx.arc(posRef.current.x, posRef.current.y, config.maxDistance, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.arc(posRef.current.x, posRef.current.y, config.minDistance, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          // 7. Render Players as 2D Animated Characters
          const realTimeNow = Date.now();
          players.forEach((p) => {
            const isMe = p.id === localPlayer.id;
            const pX = isMe ? posRef.current.x : p.position.x;
            const pY = isMe ? posRef.current.y : p.position.y;
            const facing = isMe ? angleRef.current : p.facingAngle;

            const dist = Math.hypot(pX - posRef.current.x, pY - posRef.current.y);
            const inVoiceRange = dist <= config.maxDistance;

            const activeEmoteObj = isMe ? localPlayer.activeEmote : p.activeEmote;
            const activeEmote = activeEmoteObj && activeEmoteObj.expiresAt > realTimeNow ? activeEmoteObj.emoji : undefined;

            if (isMe && isSprinting && isMoving) {
              for (let i = 1; i <= 3; i++) {
                const trailX = pX - Math.cos(facing) * (i * 16);
                const trailY = pY - Math.sin(facing) * (i * 16);
                ctx.beginPath();
                ctx.arc(trailX, trailY, 18 * (1 - i * 0.2), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(96, 165, 250, ${0.35 - i * 0.1})`;
                ctx.fill();
              }
            }

            if (p.isTalking && !p.isMuted) {
              const pulseSize = 34 + Math.sin(now / 100) * 5;
              ctx.beginPath();
              ctx.arc(pX, pY, pulseSize, 0, Math.PI * 2);
              ctx.fillStyle = isMe ? 'rgba(59, 130, 246, 0.35)' : 'rgba(16, 185, 129, 0.35)';
              ctx.fill();

              ctx.strokeStyle = isMe ? '#60a5fa' : '#34d399';
              ctx.lineWidth = 2;
              ctx.stroke();
            }

            draw2DCharacter(
              ctx,
              pX,
              pY,
              facing,
              p.color || '#3b82f6',
              isMe ? (isMoving ? (isSprinting ? 2.2 : 1.2) : 0) : 0.8,
              walkDistanceRef.current,
              isMe,
              activeEmote,
              now
            );

            if (activeEmote) {
              const bubbleY = pY - 56;
              const bounce = Math.sin(now / 100) * 4;

              ctx.save();
              ctx.translate(pX, bubbleY + bounce);

              ctx.beginPath();
              ctx.arc(0, 0, 19, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
              ctx.fill();
              ctx.strokeStyle = '#c084fc';
              ctx.lineWidth = 2;
              ctx.stroke();

              ctx.font = '19px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(activeEmote, 0, 6);

              ctx.restore();
            }

            const nameY = pY + 40;
            ctx.fillStyle = isMe ? '#60a5fa' : inVoiceRange ? '#f8fafc' : '#94a3b8';
            ctx.font = `bold ${isMe ? '14px' : '12px'} system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(p.name + (isMe ? ' (You)' : ''), pX, nameY);

            if (!isMe) {
              const distanceText = `${Math.round(dist / 10)}m`;
              ctx.fillStyle = inVoiceRange ? '#34d399' : '#64748b';
              ctx.font = '10px sans-serif';
              ctx.fillText(inVoiceRange ? `[Voice Active ${distanceText}]` : `[Out of Range ${distanceText}]`, pX, nameY + 14);
            }
          });

          ctx.restore();
        }
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [players, localPlayer, showAudioRadius, audioEngine, onPositionUpdate, zoomScale]);

  const handleVirtualPress = (dir: string, active: boolean) => {
    keysRef.current[dir] = active;
    if (dir === 'shift') {
      setIsSprintingState(active);
    }
  };

  const handleSelectEmoteInModal = (emoji: string) => {
    onSendEmote(emoji);
    onToggleEmotePicker();
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`relative w-full h-full overflow-hidden select-none bg-slate-950 outline-none ${
        hideCursor ? 'cursor-none' : ''
      }`}
    >
      <canvas ref={canvasRef} className={`block w-full h-full ${hideCursor ? 'cursor-none' : 'cursor-crosshair'}`} />

      {/* Controls Overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none font-sans">
        <div className="px-3.5 py-2 bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-xl text-slate-200 text-xs font-medium shadow-lg flex items-center gap-2">
          <span className="px-1.5 py-0.5 bg-slate-800 rounded font-mono font-bold text-blue-400 border border-slate-700">
            WASD / ARROWS
          </span>
          <span>Move</span>
          <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-xs border ${
            isSprintingState 
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            ⚡ SHIFT (Sprint)
          </span>
        </div>

        <div className="px-3 py-1.5 bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-xl text-slate-300 text-[11px] font-medium shadow-lg flex items-center gap-2">
          <span className="text-slate-400">Hotkeys:</span>
          <span><kbd className="px-1 bg-slate-800 rounded font-mono font-bold text-blue-400 border border-slate-700">/</kbd> Chat</span>
          <span><kbd className="px-1 bg-slate-800 rounded font-mono font-bold text-blue-400 border border-slate-700">M</kbd> Map</span>
          <span><kbd className="px-1 bg-slate-800 rounded font-mono font-bold text-blue-400 border border-slate-700">U</kbd> Mic</span>
          <span><kbd className="px-1 bg-slate-800 rounded font-mono font-bold text-purple-400 border border-slate-700">E</kbd> Emotes</span>
          <span><kbd className="px-1 bg-slate-800 rounded font-mono font-bold text-amber-400 border border-slate-700">Wheel</kbd> Zoom</span>
        </div>

        <div className="px-3.5 py-2 bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-xl text-slate-200 text-xs font-medium shadow-lg flex items-center gap-2">
          <span className="text-slate-400">Zone:</span>
          <span className="font-bold text-emerald-400">📍 {currentRoom}</span>
        </div>
      </div>

      {/* CAMERA POV ZOOM CONTROL WIDGET (Top Right) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-slate-900/90 border border-slate-800 backdrop-blur-xl p-1.5 rounded-2xl shadow-2xl font-sans">
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          title="Zoom Out Camera (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleResetZoom}
          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 font-mono font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
          title="Reset Camera POV Level (1.0x)"
        >
          <Maximize2 className="w-3 h-3" />
          <span>{Math.round(zoomScale * 100)}%</span>
        </button>

        <button
          type="button"
          onClick={handleZoomIn}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          title="Zoom In Camera (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* QUICK EMOTE PICKER HUD BUTTON (Bottom Center) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 backdrop-blur-xl p-2 rounded-2xl shadow-2xl">
        <button
          type="button"
          onClick={onToggleEmotePicker}
          className={`px-4 py-2 rounded-xl border transition-all cursor-pointer flex items-center gap-2 text-xs font-bold ${
            showEmotePicker 
              ? 'bg-purple-600 border-purple-400 text-white shadow-lg ring-2 ring-purple-500/50' 
              : 'bg-slate-800 hover:bg-slate-700 text-purple-300 border-slate-700'
          }`}
          title="Press 'E' to open Emote Menu"
        >
          <Smile className="w-4 h-4 text-purple-300 animate-bounce" />
          <span>EMOTES MENU</span>
          <kbd className="px-1.5 py-0.5 bg-slate-950 border border-purple-500/60 rounded text-[10px] font-mono text-purple-300 font-bold">
            E
          </kbd>
        </button>
      </div>

      {/* PROMINENT CENTER EMOTE PICKER MODAL */}
      {showEmotePicker && (
        <div className="absolute inset-0 z-30 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150 font-sans">
          <div className="bg-slate-900/95 border border-purple-500/40 rounded-3xl p-6 shadow-2xl max-w-sm w-full relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smile className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-bold text-slate-100 tracking-wide">Select Character Emote</h2>
              </div>
              <button
                type="button"
                onClick={onToggleEmotePicker}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Close (E / Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4 text-center">
              Click an emote below or press number keys <kbd className="px-1 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-slate-300 font-bold">1-9</kbd> to perform a 3-second live gesture!
            </p>

            <div className="grid grid-cols-3 gap-2.5">
              {AVAILABLE_EMOTES.map((em) => {
                const isEmoteActive = localPlayer.activeEmote?.emoji === em.emoji && (localPlayer.activeEmote?.expiresAt || 0) > Date.now();
                return (
                  <button
                    key={em.name}
                    type="button"
                    onClick={() => handleSelectEmoteInModal(em.emoji)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer transform hover:scale-105 active:scale-95 ${
                      isEmoteActive
                        ? 'bg-purple-600 border-purple-400 text-white ring-2 ring-purple-400/60 shadow-lg animate-pulse'
                        : 'bg-slate-950/80 hover:bg-purple-950/40 border-slate-800 hover:border-purple-500/50 text-slate-200'
                    }`}
                  >
                    <span className="text-2xl mb-1">{em.emoji}</span>
                    <span className="text-[11px] font-bold text-slate-300">{em.name}</span>
                    <span className="text-[9px] font-mono text-purple-400 mt-0.5">Key [{em.hotkey}]</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={onToggleEmotePicker}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                Close Menu (Press E)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* On-Screen D-Pad & Sprint Button */}
      <div className="absolute bottom-20 right-6 z-20 flex flex-col items-center gap-2 bg-slate-900/80 p-3 rounded-2xl border border-slate-800 backdrop-blur-md shadow-2xl">
        <button
          type="button"
          onMouseDown={() => handleVirtualPress('shift', true)}
          onMouseUp={() => handleVirtualPress('shift', false)}
          onTouchStart={() => handleVirtualPress('shift', true)}
          onTouchEnd={() => handleVirtualPress('shift', false)}
          className={`w-full py-1.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
            isSprintingState
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
        >
          ⚡ SPRINT (SHIFT)
        </button>

        <button
          type="button"
          onMouseDown={() => handleVirtualPress('w', true)}
          onMouseUp={() => handleVirtualPress('w', false)}
          onTouchStart={() => handleVirtualPress('w', true)}
          onTouchEnd={() => handleVirtualPress('w', false)}
          className="w-10 h-10 bg-slate-800 hover:bg-blue-600 active:bg-blue-700 text-slate-200 rounded-xl font-bold border border-slate-700 shadow flex items-center justify-center text-xs cursor-pointer"
        >
          ▲
        </button>
        <div className="flex gap-1.5">
          <button
            type="button"
            onMouseDown={() => handleVirtualPress('a', true)}
            onMouseUp={() => handleVirtualPress('a', false)}
            onTouchStart={() => handleVirtualPress('a', true)}
            onTouchEnd={() => handleVirtualPress('a', false)}
            className="w-10 h-10 bg-slate-800 hover:bg-blue-600 active:bg-blue-700 text-slate-200 rounded-xl font-bold border border-slate-700 shadow flex items-center justify-center text-xs cursor-pointer"
          >
            ◀
          </button>
          <button
            type="button"
            onMouseDown={() => handleVirtualPress('s', true)}
            onMouseUp={() => handleVirtualPress('s', false)}
            onTouchStart={() => handleVirtualPress('s', true)}
            onTouchEnd={() => handleVirtualPress('s', false)}
            className="w-10 h-10 bg-slate-800 hover:bg-blue-600 active:bg-blue-700 text-slate-200 rounded-xl font-bold border border-slate-700 shadow flex items-center justify-center text-xs cursor-pointer"
          >
            ▼
          </button>
          <button
            type="button"
            onMouseDown={() => handleVirtualPress('d', true)}
            onMouseUp={() => handleVirtualPress('d', false)}
            onTouchStart={() => handleVirtualPress('d', true)}
            onTouchEnd={() => handleVirtualPress('d', false)}
            className="w-10 h-10 bg-slate-800 hover:bg-blue-600 active:bg-blue-700 text-slate-200 rounded-xl font-bold border border-slate-700 shadow flex items-center justify-center text-xs cursor-pointer"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
};

// --- ROAD & PEDESTRIAN WALKWAYS RENDERER ---
function drawRoads(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;

  // Main Horizontal Central Avenue (Y: 1600 - 1800)
  ctx.fillRect(100, 1600, 4800, 200);
  ctx.strokeRect(100, 1600, 4800, 200);

  // Main Vertical Central Avenue (X: 2400 - 2600)
  ctx.fillRect(2400, 100, 200, 3300);
  ctx.strokeRect(2400, 100, 200, 3300);

  // Cobblestone Road Markings / Center Lines
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  ctx.setLineDash([20, 20]);

  // Horizontal Yellow Dividing Line
  ctx.beginPath();
  ctx.moveTo(100, 1700);
  ctx.lineTo(4900, 1700);
  ctx.stroke();

  // Vertical Yellow Dividing Line
  ctx.beginPath();
  ctx.moveTo(2500, 100);
  ctx.lineTo(2500, 3400);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.restore();
}

// --- CENTRAL FOUNTAIN MONUMENT RENDERER ---
function drawCentralFountain(ctx: CanvasRenderingContext2D, now: number) {
  ctx.save();
  const fX = 2500;
  const fY = 1500;

  // Outer Stone Plaza Ring
  ctx.beginPath();
  ctx.arc(fX, fY, 110, 0, Math.PI * 2);
  ctx.fillStyle = '#1e293b';
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Water Pool
  const waveRadius = 75 + Math.sin(now / 150) * 5;
  ctx.beginPath();
  ctx.arc(fX, fY, waveRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(14, 165, 233, 0.35)';
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Fountain Inner Core Statue
  ctx.beginPath();
  ctx.arc(fX, fY, 32, 0, Math.PI * 2);
  ctx.fillStyle = '#7dd3fc';
  ctx.fill();
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Water Jet Ripples
  for (let i = 0; i < 4; i++) {
    const angle = (now / 300) + (i * Math.PI / 2);
    const jX = fX + Math.cos(angle) * 45;
    const jY = fY + Math.sin(angle) * 45;
    ctx.beginPath();
    ctx.arc(jX, jY, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();
  }

  ctx.fillStyle = '#e0f2fe';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✨ CYBER FOUNTAIN ✨', fX, fY + 5);
  ctx.restore();
}

// --- ROOM PROPS: DJ STAGE & DANCE FLOOR ---
function drawDJStageProps(ctx: CanvasRenderingContext2D, room: any, now: number) {
  ctx.save();
  const sX = room.x + 300;
  const sY = room.y + 120;
  const sW = 700;
  const sH = 200;

  // Elevated Stage Platform
  ctx.fillStyle = '#1e1b4b';
  ctx.fillRect(sX, sY, sW, sH);
  ctx.strokeStyle = '#818cf8';
  ctx.lineWidth = 4;
  ctx.strokeRect(sX, sY, sW, sH);

  // DJ Turntable Booth Desk
  ctx.fillStyle = '#312e81';
  ctx.fillRect(sX + 250, sY + 60, 200, 80);
  ctx.strokeStyle = '#a5b4fc';
  ctx.lineWidth = 2;
  ctx.strokeRect(sX + 250, sY + 60, 200, 80);

  // Vinyl Records
  ctx.beginPath();
  ctx.arc(sX + 300, sY + 100, 18, 0, Math.PI * 2);
  ctx.fillStyle = '#09090b';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(sX + 400, sY + 100, 18, 0, Math.PI * 2);
  ctx.fill();

  // GIANT CONCERT SPEAKER TOWERS (Left & Right)
  const pulse = Math.abs(Math.sin(now / 80)) * 6;

  // Left Speaker Stack
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(sX + 40, sY + 30, 90, 140);
  ctx.strokeStyle = '#c084fc';
  ctx.strokeRect(sX + 40, sY + 30, 90, 140);
  ctx.beginPath();
  ctx.arc(sX + 85, sY + 70, 22 + pulse, 0, Math.PI * 2);
  ctx.fillStyle = '#a855f7';
  ctx.fill();

  // Right Speaker Stack
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(sX + 570, sY + 30, 90, 140);
  ctx.strokeStyle = '#c084fc';
  ctx.strokeRect(sX + 570, sY + 30, 90, 140);
  ctx.beginPath();
  ctx.arc(sX + 615, sY + 70, 22 + pulse, 0, Math.PI * 2);
  ctx.fillStyle = '#a855f7';
  ctx.fill();

  // Laser Beams Sweeping Across Dance Floor
  const laserAngle = Math.sin(now / 200) * 0.8;
  ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(sX + 350, sY + 140);
  ctx.lineTo(sX + 350 + Math.cos(laserAngle) * 500, sY + 600 + Math.sin(laserAngle) * 200);
  ctx.stroke();

  ctx.restore();
}

// --- ROOM PROPS: VIP BAR & LOUNGE ---
function drawVIPBarProps(ctx: CanvasRenderingContext2D, room: any) {
  ctx.save();
  const bX = room.x + 200;
  const bY = room.y + 200;

  // Curved Bar Counter
  ctx.fillStyle = '#4c1d95';
  ctx.fillRect(bX, bY, 850, 90);
  ctx.strokeStyle = '#c084fc';
  ctx.lineWidth = 3;
  ctx.strokeRect(bX, bY, 850, 90);

  // Bar Stools
  for (let stoolX = bX + 60; stoolX < bX + 800; stoolX += 90) {
    ctx.beginPath();
    ctx.arc(stoolX, bY + 125, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#9333ea';
    ctx.fill();
    ctx.strokeStyle = '#f3e8ff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // VIP Lounge U-Sofa Group
  ctx.fillStyle = '#581c87';
  ctx.fillRect(room.x + 250, room.y + 500, 700, 60);
  ctx.fillRect(room.x + 250, room.y + 500, 60, 250);
  ctx.fillRect(room.x + 890, room.y + 500, 60, 250);

  // Glass Coffee Table
  ctx.fillStyle = 'rgba(192, 132, 252, 0.25)';
  ctx.fillRect(room.x + 360, room.y + 580, 480, 110);
  ctx.strokeStyle = '#e9d5ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(room.x + 360, room.y + 580, 480, 110);

  ctx.restore();
}

// --- ROOM PROPS: NEON ARCADE ---
function drawArcadeProps(ctx: CanvasRenderingContext2D, room: any) {
  ctx.save();
  // Row of Arcade Cabinets
  const arcades = ['PAC-MAN 🕹️', 'GALAGA 🚀', 'STREET FIGHTER 🥋', 'PINBALL 🎰', 'RACING 🏎️'];
  let aX = room.x + 150;
  for (const arc of arcades) {
    ctx.fillStyle = '#14532d';
    ctx.fillRect(aX, room.y + 150, 140, 180);
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 3;
    ctx.strokeRect(aX, room.y + 150, 140, 180);

    // Cabinet Screen
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(aX + 15, room.y + 180, 110, 80);

    ctx.fillStyle = '#f0fdf4';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(arc, aX + 70, room.y + 225);
    aX += 220;
  }

  // Pool Billiard Table
  const pX = room.x + 300;
  const pY = room.y + 550;
  ctx.fillStyle = '#15803d'; // Green felt
  ctx.fillRect(pX, pY, 400, 220);
  ctx.strokeStyle = '#78350f'; // Wood border
  ctx.lineWidth = 12;
  ctx.strokeRect(pX, pY, 400, 220);

  // Billiard Balls
  ctx.beginPath();
  ctx.arc(pX + 280, pY + 110, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#ef4444';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(pX + 300, pY + 100, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#eab308';
  ctx.fill();

  ctx.restore();
}

// --- ROOM PROPS: OUTDOOR COURTYARD STAGE ---
function drawOutdoorStageProps(ctx: CanvasRenderingContext2D, room: any, now: number) {
  ctx.save();
  const stX = room.x + 350;
  const stY = room.y + 120;

  // Stage Platform
  ctx.fillStyle = '#312e81';
  ctx.fillRect(stX, stY, 700, 180);
  ctx.strokeStyle = '#818cf8';
  ctx.lineWidth = 4;
  ctx.strokeRect(stX, stY, 700, 180);

  // Mic Stand
  ctx.beginPath();
  ctx.arc(stX + 350, stY + 90, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();

  // Spotlight Cones
  const spotGlow = Math.sin(now / 150) * 0.1 + 0.25;
  ctx.fillStyle = `rgba(251, 191, 36, ${spotGlow})`;
  ctx.beginPath();
  ctx.moveTo(stX + 150, stY);
  ctx.lineTo(stX + 50, stY + 450);
  ctx.lineTo(stX + 250, stY + 450);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// --- ROOM PROPS: CAFÉ PATIO ---
function drawCafeProps(ctx: CanvasRenderingContext2D, room: any) {
  ctx.save();
  // Round Café Tables with Umbrellas
  const tables = [
    { x: room.x + 300, y: room.y + 250 },
    { x: room.x + 700, y: room.y + 250 },
    { x: room.x + 300, y: room.y + 550 },
    { x: room.x + 700, y: room.y + 550 },
  ];

  for (const t of tables) {
    // Umbrella Canopy
    ctx.beginPath();
    ctx.arc(t.x, t.y, 65, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Table Top
    ctx.beginPath();
    ctx.arc(t.x, t.y, 25, 0, Math.PI * 2);
    ctx.fillStyle = '#fffbeb';
    ctx.fill();
  }
  ctx.restore();
}

// --- ROOM PROPS: OBSERVATORY ---
function drawObservatoryProps(ctx: CanvasRenderingContext2D, room: any) {
  ctx.save();
  // Giant Astronomical Telescope
  const tX = room.x + 650;
  const tY = room.y + 400;

  ctx.fillStyle = '#0284c7';
  ctx.fillRect(tX - 120, tY - 20, 240, 40);
  ctx.strokeStyle = '#bae6fd';
  ctx.lineWidth = 3;
  ctx.strokeRect(tX - 120, tY - 20, 240, 40);

  ctx.beginPath();
  ctx.arc(tX, tY, 50, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#e0f2fe';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🔭 DEEP SPACE TELESCOPE', tX, tY + 4);
  ctx.restore();
}

// --- ROOM PROPS: ZEN CHILL LOUNGE ---
function drawZenLoungeProps(ctx: CanvasRenderingContext2D, room: any) {
  ctx.save();
  // Zen Garden Bamboo Ring & Beanbags
  ctx.beginPath();
  ctx.arc(room.x + 700, room.y + 320, 160, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(20, 184, 166, 0.2)';
  ctx.fill();
  ctx.strokeStyle = '#2dd4bf';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Beanbag Loungers
  const bags = [
    { x: room.x + 620, y: room.y + 320 },
    { x: room.x + 780, y: room.y + 320 },
    { x: room.x + 700, y: room.y + 240 },
    { x: room.x + 700, y: room.y + 400 },
  ];
  for (const b of bags) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#0d9488';
    ctx.fill();
  }
  ctx.restore();
}

// --- ENVIRONMENTAL TREES & STREET LAMP POSTS ---
function drawEnvironmentalTreesAndLamps(ctx: CanvasRenderingContext2D) {
  ctx.save();
  const trees = [
    { x: 1650, y: 800, type: 'oak' },
    { x: 3350, y: 800, type: 'oak' },
    { x: 1650, y: 2200, type: 'oak' },
    { x: 3350, y: 2200, type: 'oak' },
    { x: 2100, y: 1400, type: 'palm' },
    { x: 2900, y: 1400, type: 'palm' },
    { x: 2100, y: 1800, type: 'palm' },
    { x: 2900, y: 1800, type: 'palm' },
    { x: 1600, y: 3100, type: 'oak' },
    { x: 3400, y: 3100, type: 'oak' }
  ];

  for (const tree of trees) {
    if (tree.type === 'palm') {
      // Palm Tree Canopy
      ctx.beginPath();
      ctx.arc(tree.x, tree.y, 35, 0, Math.PI * 2);
      ctx.fillStyle = '#15803d';
      ctx.fill();
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(tree.x, tree.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#78350f';
      ctx.fill();
    } else {
      // Oak Tree Canopy
      ctx.beginPath();
      ctx.arc(tree.x, tree.y, 45, 0, Math.PI * 2);
      ctx.fillStyle = '#166534';
      ctx.fill();
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Foliage Inner Ring
      ctx.beginPath();
      ctx.arc(tree.x - 8, tree.y - 8, 25, 0, Math.PI * 2);
      ctx.fillStyle = '#15803d';
      ctx.fill();
    }
  }

  // Street Lamp Posts
  const lamps = [
    { x: 2350, y: 1350 },
    { x: 2650, y: 1350 },
    { x: 2350, y: 1850 },
    { x: 2650, y: 1850 },
  ];
  for (const lamp of lamps) {
    // Lamp Light Glow Aura
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 40, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(253, 224, 71, 0.15)';
    ctx.fill();

    // Lamp Post Pole
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fde047';
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Custom 2D Character Renderer with visible hands, stride sway, 
 * active emote gestures (wave, dance, raise, clap, hype, fire, love, laugh, thumbs-up), torso suit, and head visor
 */
function draw2DCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facingAngle: number,
  color: string,
  speedFactor: number,
  totalDistance: number,
  isLocal: boolean,
  activeEmote?: string,
  now: number = 0
) {
  ctx.save();
  ctx.translate(x, y);

  if (activeEmote === '💃') {
    const danceOffset = Math.sin(now / 70) * 5;
    ctx.translate(danceOffset, Math.abs(Math.sin(now / 90)) * -4);
  } else if (activeEmote === '❤️') {
    ctx.translate(0, Math.sin(now / 150) * 4);
  } else if (activeEmote === '😂') {
    ctx.translate(0, Math.sin(now / 30) * 3);
  } else if (activeEmote === '👍') {
    ctx.translate(0, Math.sin(now / 120) * 2);
  } else if (activeEmote === '🔥') {
    ctx.translate(0, Math.abs(Math.sin(now / 60)) * -5);
  } else if (activeEmote === '⚡') {
    ctx.rotate(Math.sin(now / 50) * 0.15);
  } else if (activeEmote === '🎉') {
    ctx.translate(0, Math.abs(Math.sin(now / 100)) * -7);
  }

  // 1. Oval Drop Shadow beneath feet
  ctx.beginPath();
  ctx.ellipse(0, 22, 16, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fill();

  // 2. Leg Walking / Emote Motion Stride
  const stridePhase = speedFactor > 0 ? Math.sin(totalDistance * 0.08) : (activeEmote === '🔥' ? Math.sin(now / 60) : 0);
  const leftLegY = stridePhase * 7;
  const rightLegY = -stridePhase * 7;

  // Draw Left & Right Animated Legs
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-10, 8 + leftLegY, 7, 12);
  ctx.fillRect(3, 8 + rightLegY, 7, 12);

  // Shoes / Feet
  ctx.fillStyle = '#334155';
  ctx.fillRect(-11, 17 + leftLegY, 9, 5);
  ctx.fillRect(2, 17 + rightLegY, 9, 5);

  // 3. Torso / Suit Body
  ctx.beginPath();
  ctx.roundRect(-14, -12, 28, 24, [8]);
  ctx.fillStyle = color || '#3b82f6';
  ctx.fill();

  ctx.strokeStyle = isLocal ? '#ffffff' : 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = isLocal ? 2.5 : 1.5;
  ctx.stroke();

  // Chest Suit Accent Detail
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(-8, -8, 16, 12);

  // Belt Line
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-14, 6, 28, 4);

  // 4. VISIBLE HANDS & UNIQUE EMOTE GESTURE ANIMATIONS
  const armSway = speedFactor > 0 ? Math.sin(totalDistance * 0.08) * 5 : 0;

  let leftHandY = -2 - armSway;
  let rightHandY = -2 + armSway;
  let rightHandX = 18;
  let leftHandX = -18;

  if (activeEmote === '👋') {
    rightHandX = 16 + Math.sin(now / 60) * 8;
    rightHandY = -24;
  } else if (activeEmote === '💃') {
    leftHandY = -16 + Math.sin(now / 80) * 8;
    rightHandY = -16 - Math.sin(now / 80) * 8;
  } else if (activeEmote === '❤️') {
    leftHandX = -6;
    rightHandX = 6;
    leftHandY = -8;
    rightHandY = -8;
  } else if (activeEmote === '😂') {
    leftHandX = -10;
    rightHandX = 10;
    leftHandY = 4;
    rightHandY = 4;
  } else if (activeEmote === '👍') {
    rightHandX = 18;
    rightHandY = -24;
    leftHandX = -14;
    leftHandY = 2;
  } else if (activeEmote === '🔥') {
    leftHandY = -18 + Math.sin(now / 50) * 6;
    rightHandY = -18 - Math.sin(now / 50) * 6;
  } else if (activeEmote === '⚡') {
    leftHandX = -24;
    rightHandX = 24;
    leftHandY = -18 + Math.sin(now / 60) * 4;
    rightHandY = -18 + Math.cos(now / 60) * 4;
  } else if (activeEmote === '👏') {
    const clapOffset = Math.sin(now / 40) * 6;
    leftHandX = -6 - clapOffset;
    rightHandX = 6 + clapOffset;
    leftHandY = -4;
    rightHandY = -4;
  } else if (activeEmote === '🎉') {
    leftHandY = -22 + Math.sin(now / 80) * 4;
    rightHandY = -22 - Math.sin(now / 80) * 4;
  }

  // Draw Left Hand (Globe)
  ctx.beginPath();
  ctx.arc(leftHandX, leftHandY, 5, 0, Math.PI * 2);
  ctx.fillStyle = color || '#3b82f6';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw Right Hand (Globe)
  ctx.beginPath();
  ctx.arc(rightHandX, rightHandY, 5, 0, Math.PI * 2);
  ctx.fillStyle = color || '#3b82f6';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 5. Character Head
  ctx.beginPath();
  ctx.arc(0, -18, 14, 0, Math.PI * 2);
  ctx.fillStyle = color || '#3b82f6';
  ctx.fill();
  ctx.stroke();

  // 6. Glowing Head Visor (Oriented in Direction of Movement)
  const visorX = Math.cos(facingAngle) * 7;
  const visorY = -18 + Math.sin(facingAngle) * 7;

  ctx.beginPath();
  ctx.arc(visorX, visorY, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#bae6fd';
  ctx.fill();

  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Visor Shine Reflection
  ctx.beginPath();
  ctx.arc(visorX - 1.5, visorY - 1.5, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.restore();
}
