import React, { useState, useEffect } from 'react';
import { Mic, Play, Users, Volume2, Shield, Radio } from 'lucide-react';
import type { SpatialAudioEngine } from '../../engine/SpatialAudioEngine';

interface ServerLobbyProps {
  onJoin: (name: string, color: string, roomCode: string) => void;
  audioEngine: SpatialAudioEngine;
}

const AVATAR_COLORS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Green', hex: '#10b981' },
  { name: 'Lime', hex: '#84cc16' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'White', hex: '#f8fafc' },
];

export const ServerLobby: React.FC<ServerLobbyProps> = ({ onJoin, audioEngine }) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#84cc16');
  const [roomCode, setRoomCode] = useState('LOBBY-001');
  const [micTesting, setMicTesting] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [isMicGranted, setIsMicGranted] = useState<boolean | null>(null);

  useEffect(() => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setName(`Crewmate_${randomNum}`);
  }, []);

  const handleTestMic = async () => {
    const success = await audioEngine.initAudio();
    setIsMicGranted(success);
    setMicTesting(true);

    audioEngine.setTalkingCallback((_isTalking, volume) => {
      setMicLevel(volume);
    });
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isMicGranted === null) {
      await audioEngine.initAudio();
    }
    onJoin(name.trim(), selectedColor, roomCode.trim().toUpperCase());
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-3 sm:p-6 py-6 sm:py-8 font-sans relative overflow-y-auto">
      {/* Background ambient lighting effects */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-slate-900/95 border border-slate-800 backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-2xl my-auto">
        
        {/* Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-1.5">
            <Radio className="w-3 h-3 animate-pulse text-blue-400" />
            2D Spatial Proximity Audio Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            SPATIAL CREW
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Join the Among Us style server map with real-time proximity voice chat! Walk closer to speak with crewmates.
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          {/* Avatar Dot Preview */}
          <div className="flex flex-col items-center justify-center gap-1.5 py-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Avatar Dot Preview
            </div>

            <div className="relative flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-blue-400/40 animate-[spin_10s_linear_infinite] flex items-center justify-center" />
              
              <div 
                className="absolute w-8 h-8 rounded-full shadow-lg flex items-center justify-center transition-all duration-300"
                style={{ 
                  backgroundColor: selectedColor,
                  boxShadow: `0 0 16px ${selectedColor}80` 
                }}
              >
                <div className="w-4.5 h-2.5 rounded-full bg-sky-200/90 border border-slate-900 shadow-inner" />
              </div>
            </div>

            <span className="text-xs font-semibold text-slate-200">
              {name || 'Crewmate'}
            </span>
          </div>

          {/* Player Name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Crewmate Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter username..."
              maxLength={16}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Select Dot Color
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setSelectedColor(c.hex)}
                  className={`h-7 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                    selectedColor === c.hex
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-105'
                      : 'hover:opacity-90 opacity-70'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Server Room Code */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Server Room Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="LOBBY-001"
                maxLength={10}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 tracking-wider font-mono uppercase placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setRoomCode(`ROOM-${Math.floor(100 + Math.random() * 900)}`)}
                className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-xs transition-colors border border-slate-700 shrink-0 cursor-pointer"
              >
                Random
              </button>
            </div>
          </div>

          {/* Mic Testing Section */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5 text-[11px]">
                <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                Microphone Test
              </span>
              {isMicGranted === true && (
                <span className="text-emerald-400 font-medium flex items-center gap-1 text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Mic Active
                </span>
              )}
            </div>

            {!micTesting ? (
              <button
                type="button"
                onClick={handleTestMic}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5 text-blue-400" />
                Enable & Test Microphone
              </button>
            ) : (
              <div className="space-y-1">
                <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-75"
                    style={{ width: `${Math.min(100, micLevel * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 text-center">
                  Speak into your mic to verify input level visualization.
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            <Play className="w-4.5 h-4.5 fill-current" />
            ENTER GAME SERVER
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-3 text-center text-[10px] text-slate-500 flex items-center justify-center gap-4">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-slate-400" /> Spatial Audio
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 text-slate-400" /> WASD Controls
          </span>
        </div>

      </div>
    </div>
  );
};
