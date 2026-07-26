import React, { useState, useEffect, useRef } from 'react';
import { PRESET_TRACKS, fetchAvailableTracks, DJTrack, DJMusicState, DJMusicEngine } from '../../engine/DJMusicEngine';

interface DJControlPanelProps {
  djEngine: DJMusicEngine;
  djState: DJMusicState;
  localPlayerName: string;
  onUpdateState: (state: DJMusicState) => void;
  onClose: () => void;
}

export const DJControlPanel: React.FC<DJControlPanelProps> = ({
  djEngine,
  djState,
  localPlayerName,
  onUpdateState,
  onClose,
}) => {
  const [tracksList, setTracksList] = useState<DJTrack[]>(PRESET_TRACKS);
  const [selectedTrackId, setSelectedTrackId] = useState<string>(djState.trackId || (PRESET_TRACKS[0]?.id ?? ''));
  const [volume, setVolume] = useState<number>(0.8);
  const [freqData, setFreqData] = useState<number[]>(new Array(16).fill(0));
  const animRef = useRef<number | null>(null);

  // Fetch actual local music files on mount
  useEffect(() => {
    fetchAvailableTracks().then((available) => {
      setTracksList(available);
      if (!selectedTrackId && available.length > 0) {
        setSelectedTrackId(available[0].id);
      }
    });
  }, []);

  // Equalizer animation loop
  useEffect(() => {
    const rawData = new Uint8Array(32);
    const updateEqualizer = () => {
      djEngine.getFrequencyData(rawData);
      // Downsample 32 values to 16 bars
      const bars: number[] = [];
      for (let i = 0; i < 16; i++) {
        const val = (rawData[i * 2] + rawData[i * 2 + 1]) / 2;
        bars.push(val / 255);
      }
      setFreqData(bars);
      animRef.current = requestAnimationFrame(updateEqualizer);
    };

    updateEqualizer();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [djEngine]);

  const handlePlay = () => {
    const track = tracksList.find((t) => t.id === selectedTrackId) || PRESET_TRACKS.find((t) => t.id === selectedTrackId);
    const trackName = track ? track.name : 'DJ Track';

    const newState: DJMusicState = {
      isPlaying: true,
      trackId: selectedTrackId,
      trackName,
      djName: localPlayerName,
      startedAt: Date.now(),
    };

    onUpdateState(newState);
  };

  const handlePause = () => {
    const newState: DJMusicState = {
      ...djState,
      isPlaying: false,
    };
    onUpdateState(newState);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    djEngine.setMasterVolume(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in p-4">
      <div className="relative w-full max-w-2xl bg-slate-900/90 border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-500/20 text-white overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/30 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-xl animate-pulse">
              🎧
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wider text-cyan-300">CYBERPUNK DJ BOOTH CONSOLE</h2>
              <p className="text-xs text-slate-400">
                Current DJ: <span className="text-emerald-400 font-semibold">{djState.djName || 'None'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 hover:bg-rose-500/20 hover:border-rose-500 text-slate-400 hover:text-rose-300 flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Live Audio Equalizer Display */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-cyan-900/40 flex flex-col items-center justify-center gap-2">
          <div className="flex items-end justify-between gap-1.5 w-full h-24 px-4 bg-slate-900/80 rounded-xl border border-slate-800">
            {freqData.map((val, idx) => (
              <div key={idx} className="flex-1 bg-slate-800 rounded-t flex items-end overflow-hidden h-full">
                <div
                  className="w-full transition-all duration-75 rounded-t bg-gradient-to-t from-cyan-500 via-emerald-400 to-fuchsia-500"
                  style={{
                    height: `${Math.max(6, val * 100)}%`,
                    boxShadow: val > 0.3 ? '0 0 10px rgba(6, 182, 212, 0.6)' : 'none',
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between w-full text-xs text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${djState.isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
              STATUS: {djState.isPlaying ? 'BROADCASTING LIVE 🔴' : 'STANDBY ⏸️'}
            </span>
            <span>NOW PLAYING: <strong className="text-cyan-300">{djState.trackName || 'None'}</strong></span>
          </div>
        </div>

        {/* Track Selector & Controls */}
        <div className="p-6 flex flex-col gap-5">
          {/* Select Track */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Select Track / Audio Source
            </label>
            <select
              value={selectedTrackId}
              onChange={(e) => setSelectedTrackId(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-slate-100 font-medium focus:outline-none transition"
            >
              {tracksList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Volume Control Slider */}
          <div>
            <div className="flex justify-between items-center text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <span>Master DJ Deck Volume</span>
              <span className="text-cyan-400">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={volume}
              onChange={handleVolumeChange}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {!djState.isPlaying ? (
              <button
                onClick={handlePlay}
                className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold tracking-wide shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 transition active:scale-95"
              >
                ▶ PLAY MUSIC TO ROOM
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold tracking-wide shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition active:scale-95"
              >
                ⏸ PAUSE MUSIC
              </button>
            )}

            <button
              onClick={() => {
                onUpdateState({
                  isPlaying: false,
                  trackId: PRESET_TRACKS[0].id,
                  trackName: PRESET_TRACKS[0].name,
                  djName: '',
                  startedAt: Date.now(),
                });
              }}
              className="py-3 px-5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 font-semibold transition"
            >
              ⏹ STOP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
