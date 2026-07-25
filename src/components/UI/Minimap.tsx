import React, { useEffect, useRef } from 'react';
import type { Player } from '../../types/game';
import { GameMap } from '../../engine/GameMap';

interface MinimapProps {
  localPlayer: Player;
  players: Player[];
  isOpen: boolean;
  onToggle: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  localPlayer,
  players,
  isOpen,
  onToggle,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = 600);
    const height = (canvas.height = 420);

    const scaleX = width / GameMap.MAP_WIDTH;
    const scaleY = height / GameMap.MAP_HEIGHT;

    // Draw Dark Cyber Base
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    // Draw Rooms
    for (const room of GameMap.ROOMS) {
      const rx = room.x * scaleX;
      const ry = room.y * scaleY;
      const rw = room.width * scaleX;
      const rh = room.height * scaleY;

      ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.fillRect(rx, ry, rw, rh);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rx, ry, rw, rh);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(room.name, rx + rw / 2, ry + rh / 2 + 3);
    }

    // Draw Open Doorway Indicators
    const doorPads = [
      { x: 750, y: 1070, w: 350, h: 30 },
      { x: 3850, y: 1070, w: 350, h: 30 },
      { x: 2300, y: 820, w: 400, h: 30 },
      { x: 1470, y: 1650, w: 30, h: 300 },
      { x: 3500, y: 1650, w: 30, h: 300 },
      { x: 800, y: 2500, w: 300, h: 30 },
      { x: 2300, y: 2400, w: 400, h: 30 },
      { x: 3850, y: 2500, w: 350, h: 30 }
    ];
    doorPads.forEach((d) => {
      ctx.fillStyle = '#34d399';
      ctx.fillRect(d.x * scaleX, d.y * scaleY, d.w * scaleX, d.h * scaleY);
    });

    // Draw Central Fountain
    ctx.beginPath();
    ctx.arc(2500 * scaleX, 1600 * scaleY, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();

    // Draw Outer Map Border
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);

    // Draw Remote Players
    players.forEach((p) => {
      if (p.id === localPlayer.id) return;
      const px = p.position.x * scaleX;
      const py = p.position.y * scaleY;

      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = p.color || '#34d399';
      ctx.fill();
    });

    // Draw Local Player (Glowing Blue Dot with Ring)
    const lx = localPlayer.position.x * scaleX;
    const ly = localPlayer.position.y * scaleY;

    ctx.beginPath();
    ctx.arc(lx, ly, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(lx, ly, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#60a5fa';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

  }, [isOpen, localPlayer, players]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl max-w-2xl w-full flex flex-col items-center">
        <div className="flex items-center justify-between w-full pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">🗺️</span>
            <h2 className="text-base font-bold text-slate-100">Cyber Metaverse Plaza Map (5000 × 3500)</h2>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 cursor-pointer"
          >
            Close (M / Esc)
          </button>
        </div>

        <canvas ref={canvasRef} className="rounded-2xl border border-slate-800 shadow-inner block" />

        <div className="flex items-center justify-between w-full pt-3 mt-3 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> You</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span> Crewmates</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span> Open Doorways</span>
          </div>
          <span>Press <kbd className="px-1 bg-slate-800 border border-slate-700 rounded text-blue-400 font-mono">M</kbd> to toggle</span>
        </div>
      </div>
    </div>
  );
};
