import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Radio, Eye, EyeOff, LogOut, AlertTriangle } from 'lucide-react';
import type { SpatialAudioEngine } from '../../engine/SpatialAudioEngine';

interface AudioControlsBarProps {
  audioEngine: SpatialAudioEngine;
  isMuted: boolean;
  onToggleMute: () => void;
  roomCode: string;
  showRadius: boolean;
  onToggleRadius: () => void;
  onLeave: () => void;
}

export const AudioControlsBar: React.FC<AudioControlsBarProps> = ({
  audioEngine,
  isMuted,
  onToggleMute,
  roomCode,
  showRadius,
  onToggleRadius,
  onLeave,
}) => {
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  useEffect(() => {
    audioEngine.setTalkingCallback((_isTalking, volume) => {
      setVolumeLevel(volume);
    });
  }, [audioEngine]);

  const handleConfirmLeave = () => {
    setShowLeaveConfirm(false);
    onLeave();
  };

  return (
    <>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-slate-900/90 border border-slate-800 backdrop-blur-xl px-5 py-3 rounded-2xl shadow-2xl shadow-slate-950 font-sans">
        
        {/* Microphone Mute Button (Controlled by App state) */}
        <button
          type="button"
          onClick={onToggleMute}
          className={`relative p-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center gap-2 shadow-md cursor-pointer ${
            isMuted
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
          }`}
          title={isMuted ? 'Unmute Microphone (U)' : 'Mute Microphone (U)'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 animate-pulse" />}
          <span className="hidden sm:inline">{isMuted ? 'MUTED' : 'MIC ON'}</span>
          <kbd className="hidden md:inline px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-slate-400 font-bold ml-0.5">
            U
          </kbd>
        </button>

        {/* Voice Meter Gauge */}
        <div className="flex flex-col gap-1 w-24 sm:w-32 px-1">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Mic Input</span>
            <span className={!isMuted && volumeLevel > 0.08 ? 'text-emerald-400' : 'text-slate-500'}>
              {isMuted ? 'Muted' : volumeLevel > 0.08 ? 'Talking' : 'Silent'}
            </span>
          </div>
          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                isMuted ? 'bg-slate-700' : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400'
              }`}
              style={{ width: isMuted ? '0%' : `${Math.min(100, volumeLevel * 100)}%` }}
            />
          </div>
        </div>

        <div className="w-px h-8 bg-slate-800 mx-1" />

        {/* Spatial Proximity Radius Toggle */}
        <button
          type="button"
          onClick={onToggleRadius}
          className={`p-3 rounded-xl border text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            showRadius
              ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
          }`}
          title="Toggle Proximity Audio Distance Circle"
        >
          {showRadius ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          <span className="hidden md:inline">Voice Radius</span>
        </button>

        {/* Server Room Code Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
          <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span>{roomCode}</span>
        </div>

        {/* Leave Game Server Button */}
        <button
          type="button"
          onClick={() => setShowLeaveConfirm(true)}
          className="p-3 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 border border-slate-700 hover:border-rose-800/60 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
          title="Leave Server"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden lg:inline">Leave Server</span>
        </button>

      </div>

      {/* Leave Server Warning Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150 font-sans">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto text-amber-400">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-100">Leave Server Room?</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Are you sure you want to leave <span className="font-mono text-blue-400 font-bold">{roomCode}</span>? You will disconnect from crewmates and proximity voice chat.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                Stay in Game
              </button>
              
              <button
                type="button"
                onClick={handleConfirmLeave}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/30 transition-colors cursor-pointer"
              >
                Yes, Leave Server
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
