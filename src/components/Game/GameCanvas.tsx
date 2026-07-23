import React, { useEffect, useRef, useState } from 'react';
import type { Player, Position } from '../../types/game';
import { GameMap } from '../../engine/GameMap';
import type { SpatialAudioEngine } from '../../engine/SpatialAudioEngine';

interface GameCanvasProps {
  localPlayer: Player;
  players: Player[];
  audioEngine: SpatialAudioEngine;
  onPositionUpdate: (pos: Position, angle: number) => void;
  showAudioRadius: boolean;
  hideCursor: boolean;
  onToggleHideCursor: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  localPlayer,
  players,
  audioEngine,
  onPositionUpdate,
  showAudioRadius,
  hideCursor,
  onToggleHideCursor,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const posRef = useRef<Position>({ ...localPlayer.position });
  const angleRef = useRef<number>(localPlayer.facingAngle);
  const keysRef = useRef<{ [key: string]: boolean }>({});

  const [currentRoom, setCurrentRoom] = useState<string>('Grand Cyber Plaza');

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  // Middle mouse click listener to toggle cursor visibility
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        onToggleHideCursor();
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    return () => window.removeEventListener('mousedown', handleMouseDown);
  }, [onToggleHideCursor]);

  // WASD & Arrow Key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (['input', 'textarea'].includes(activeTag)) return;

      const key = e.key.toLowerCase();
      const code = e.code;

      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key) ||
          ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
        e.preventDefault();
      }

      keysRef.current[key] = true;
      keysRef.current[code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const code = e.code;
      keysRef.current[key] = false;
      keysRef.current[code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main 60 FPS Game Loop
  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();
    const speed = 320; // Fast smooth movement across large map

    const render = (now: number) => {
      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      let dx = 0;
      let dy = 0;

      if (keysRef.current['w'] || keysRef.current['KeyW'] || keysRef.current['arrowup'] || keysRef.current['ArrowUp']) dy -= 1;
      if (keysRef.current['s'] || keysRef.current['KeyS'] || keysRef.current['arrowdown'] || keysRef.current['ArrowDown']) dy += 1;
      if (keysRef.current['a'] || keysRef.current['KeyA'] || keysRef.current['arrowleft'] || keysRef.current['ArrowLeft']) dx -= 1;
      if (keysRef.current['d'] || keysRef.current['KeyD'] || keysRef.current['arrowright'] || keysRef.current['ArrowRight']) dx += 1;

      if (dx !== 0 || dy !== 0) {
        const length = Math.hypot(dx, dy);
        const moveX = (dx / length) * speed * delta;
        const moveY = (dy / length) * speed * delta;

        angleRef.current = Math.atan2(dy, dx);

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

          const camX = width / 2 - posRef.current.x;
          const camY = height / 2 - posRef.current.y;

          ctx.save();
          ctx.translate(camX, camY);

          // Grid Background
          ctx.strokeStyle = '#1e293b';
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

          // Social Zones & Lounges Floor
          for (const room of GameMap.ROOMS) {
            ctx.fillStyle = room.color;
            ctx.fillRect(room.x, room.y, room.width, room.height);

            ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
            ctx.lineWidth = 2;
            ctx.strokeRect(room.x, room.y, room.width, room.height);

            ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
            ctx.font = 'bold 26px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(room.name.toUpperCase(), room.x + room.width / 2, room.y + room.height / 2);
          }

          // Decorative Plaza Fountain in Center
          ctx.beginPath();
          ctx.arc(2000, 1400, 90, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
          ctx.fill();
          ctx.strokeStyle = '#60a5fa';
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.fillStyle = '#93c5fd';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('✨ Neon Fountain ✨', 2000, 1405);

          // Walls & Furniture Partitions
          for (const wall of GameMap.WALLS) {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(wall.x, wall.y, wall.width, wall.height);

            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
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

          // Players
          players.forEach((p) => {
            const isMe = p.id === localPlayer.id;
            const pX = isMe ? posRef.current.x : p.position.x;
            const pY = isMe ? posRef.current.y : p.position.y;
            const radius = 20;

            const dist = Math.hypot(pX - posRef.current.x, pY - posRef.current.y);
            const inVoiceRange = dist <= config.maxDistance;

            // Voice Talking Aura Pulse
            if (p.isTalking && !p.isMuted) {
              const pulseSize = radius + 14 + Math.sin(now / 100) * 4;
              ctx.beginPath();
              ctx.arc(pX, pY, pulseSize, 0, Math.PI * 2);
              ctx.fillStyle = isMe ? 'rgba(59, 130, 246, 0.35)' : 'rgba(16, 185, 129, 0.35)';
              ctx.fill();

              ctx.strokeStyle = isMe ? '#60a5fa' : '#34d399';
              ctx.lineWidth = 2;
              ctx.stroke();
            }

            // Shadow
            ctx.beginPath();
            ctx.arc(pX, pY + 4, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fill();

            // Avatar Dot Body
            ctx.beginPath();
            ctx.arc(pX, pY, radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color || '#3b82f6';
            ctx.fill();

            ctx.strokeStyle = isMe ? '#ffffff' : 'rgba(255,255,255,0.4)';
            ctx.lineWidth = isMe ? 3 : 1.5;
            ctx.stroke();

            // Visor Line
            const facing = isMe ? angleRef.current : p.facingAngle;
            const visorX = pX + Math.cos(facing) * (radius * 0.55);
            const visorY = pY + Math.sin(facing) * (radius * 0.55);

            ctx.beginPath();
            ctx.arc(visorX, visorY, 7, 0, Math.PI * 2);
            ctx.fillStyle = '#bae6fd';
            ctx.fill();
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Mic Status Badge
            const badgeY = pY - radius - 14;
            ctx.fillStyle = p.isMuted ? '#ef4444' : p.isTalking ? '#10b981' : '#64748b';
            ctx.beginPath();
            ctx.arc(pX, badgeY, 9, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(p.isMuted ? '✕' : p.isTalking ? '🔊' : '🎙️', pX, badgeY + 3.5);

            // Name Tag & Proximity Meters
            ctx.fillStyle = isMe ? '#60a5fa' : inVoiceRange ? '#f8fafc' : '#94a3b8';
            ctx.font = `bold ${isMe ? '14px' : '12px'} system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(p.name + (isMe ? ' (You)' : ''), pX, pY + radius + 18);

            if (!isMe) {
              const distanceText = `${Math.round(dist / 10)}m`;
              ctx.fillStyle = inVoiceRange ? '#34d399' : '#64748b';
              ctx.font = '10px sans-serif';
              ctx.fillText(inVoiceRange ? `[Voice Active ${distanceText}]` : `[Out of Range ${distanceText}]`, pX, pY + radius + 30);
            }
          });

          ctx.restore();
        }
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [players, localPlayer, showAudioRadius, audioEngine, onPositionUpdate]);

  const handleVirtualPress = (dir: string, active: boolean) => {
    keysRef.current[dir] = active;
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

      {/* Controls & Zone Info Overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none font-sans">
        <div className="px-3.5 py-2 bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-xl text-slate-200 text-xs font-medium shadow-lg flex items-center gap-2">
          <span className="px-1.5 py-0.5 bg-slate-800 rounded font-mono font-bold text-blue-400 border border-slate-700">
            WASD / ARROWS
          </span>
          <span>Move</span>
        </div>

        <div className="px-3 py-1.5 bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-xl text-slate-300 text-[11px] font-medium shadow-lg flex items-center gap-2">
          <span className="text-slate-400">Hotkeys:</span>
          <span><kbd className="px-1 bg-slate-800 rounded font-mono font-bold text-blue-400 border border-slate-700">/</kbd> Chat</span>
          <span><kbd className="px-1 bg-slate-800 rounded font-mono font-bold text-blue-400 border border-slate-700">M</kbd> Map</span>
          <span><kbd className="px-1 bg-slate-800 rounded font-mono font-bold text-blue-400 border border-slate-700">U</kbd> Mic</span>
          <span><kbd className="px-1 bg-slate-800 rounded font-mono font-bold text-amber-400 border border-slate-700">MidClick</kbd> Hide Cursor</span>
        </div>

        <div className="px-3.5 py-2 bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-xl text-slate-200 text-xs font-medium shadow-lg flex items-center gap-2">
          <span className="text-slate-400">Zone:</span>
          <span className="font-bold text-emerald-400">📍 {currentRoom}</span>
        </div>
      </div>

      {/* On-Screen D-Pad */}
      <div className="absolute bottom-20 right-6 z-20 flex flex-col items-center gap-1.5 bg-slate-900/80 p-3 rounded-2xl border border-slate-800 backdrop-blur-md shadow-2xl">
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
