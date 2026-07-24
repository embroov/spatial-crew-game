import React from 'react';
import { Map, X } from 'lucide-react';
import type { Player } from '../../types/game';
import { GameMap } from '../../engine/GameMap';

interface MinimapProps {
  localPlayer: Player;
  players: Player[];
  isOpen: boolean;
  onToggle: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({ localPlayer, players, isOpen, onToggle }) => {
  const scaleX = 280 / GameMap.MAP_WIDTH;
  const scaleY = 196 / GameMap.MAP_HEIGHT;

  return (
    <div className="absolute top-4 right-4 z-20 select-none font-sans">
      {!isOpen ? (
        <button
          type="button"
          onClick={onToggle}
          className="px-3.5 py-2.5 bg-slate-900/90 border border-slate-800 backdrop-blur-md rounded-2xl text-slate-200 text-xs font-semibold shadow-2xl hover:bg-slate-800 transition-all flex items-center gap-2 cursor-pointer transform hover:scale-105"
          title="Press 'M' to toggle map"
        >
          <Map className="w-4 h-4 text-blue-400" />
          <span>Plaza Radar</span>
          <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-slate-400 font-bold">
            M
          </kbd>
        </button>
      ) : (
        <div className="w-80 bg-slate-900/95 border border-slate-800 backdrop-blur-xl rounded-2xl p-3 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Map className="w-3.5 h-3.5 text-blue-400" />
              Cyber Plaza Radar
            </span>
            <button
              type="button"
              onClick={onToggle}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Close Map (M)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative w-[280px] h-[196px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden mx-auto">
            {/* Custom Map Texture Background */}
            <img 
              src="/map.jpg" 
              alt="Cyber Plaza Map"
              className="absolute inset-0 w-full h-full object-cover opacity-90" 
            />

            {/* Render Player Dots */}
            {players.map((p) => {
              const isMe = p.id === localPlayer.id;
              const pX = p.position.x * scaleX;
              const pY = p.position.y * scaleY;

              return (
                <div
                  key={p.id}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border shadow-sm transition-all duration-100 ${
                    isMe
                      ? 'w-3.5 h-3.5 bg-white border-blue-500 z-10 animate-pulse ring-2 ring-blue-500/60'
                      : 'w-2.5 h-2.5 border-slate-950'
                  }`}
                  style={{
                    left: `${pX}px`,
                    top: `${pY}px`,
                    backgroundColor: isMe ? '#ffffff' : p.color || '#3b82f6',
                  }}
                  title={`${p.name}${isMe ? ' (You)' : ''}`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
