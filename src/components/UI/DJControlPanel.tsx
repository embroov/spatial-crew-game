import React, { useState, useEffect, useRef } from 'react';
import { PRESET_TRACKS, fetchAvailableTracks, DJTrack, DJMusicState, DJMusicEngine, formatAudioUrl } from '../../engine/DJMusicEngine';

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
  const [customLinkUrl, setCustomLinkUrl] = useState<string>(djState.customUrl || djState.trackUrl || '');
  const [customLinkTitle, setCustomLinkTitle] = useState<string>('Custom Stream Track');
  const [activeTab, setActiveTab] = useState<'list' | 'custom'>('list');

  const [volume, setVolume] = useState<number>(0.8);
  const [freqData, setFreqData] = useState<number[]>(new Array(16).fill(0));
  const animRef = useRef<number | null>(null);

  // Fetch actual song list on mount
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

  const handlePlaySelectedTrack = (trackToPlay?: DJTrack) => {
    const track = trackToPlay || tracksList.find((t) => t.id === selectedTrackId) || PRESET_TRACKS[0];
    if (!track) return;

    const formatted = track.url ? formatAudioUrl(track.url) : '';

    const newState: DJMusicState = {
      isPlaying: true,
      trackId: track.id,
      trackName: track.name,
      trackUrl: formatted || track.url,
      customUrl: formatted || track.url,
      djName: localPlayerName,
      startedAt: Date.now(),
    };

    onUpdateState(newState);
  };

  const handlePlayCustomLink = () => {
    if (!customLinkUrl.trim()) return;

    const formatted = formatAudioUrl(customLinkUrl);
    const newState: DJMusicState = {
      isPlaying: true,
      trackId: 'custom_link_stream',
      trackName: `🔗 ${customLinkTitle.trim() || 'Custom Audio Stream'}`,
      trackUrl: formatted,
      customUrl: formatted,
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

  const selectedTrack = tracksList.find((t) => t.id === selectedTrackId) || tracksList[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-fade-in p-4">
      <div className="relative w-full max-w-2xl bg-slate-900/95 border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-500/20 text-white overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/30 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/30 to-fuchsia-500/30 border border-cyan-400/50 flex items-center justify-center text-xl shadow-inner animate-pulse">
              🎧
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wider text-cyan-300">CYBERPUNK DJ BOOTH CONSOLE</h2>
              <p className="text-xs text-slate-400">
                Active DJ: <span className="text-emerald-400 font-semibold">{djState.djName || 'None'}</span>
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
        <div className="px-6 py-3 bg-slate-950/90 border-b border-cyan-900/40 flex flex-col items-center justify-center gap-2">
          <div className="flex items-end justify-between gap-1.5 w-full h-20 px-4 bg-slate-900/90 rounded-xl border border-slate-800">
            {freqData.map((val, idx) => (
              <div key={idx} className="flex-1 bg-slate-800/80 rounded-t flex items-end overflow-hidden h-full">
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
            <span className="flex items-center gap-1.5 font-mono">
              <span className={`w-2.5 h-2.5 rounded-full ${djState.isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
              STATUS: {djState.isPlaying ? 'BROADCASTING LIVE 🔴' : 'STANDBY ⏸️'}
            </span>
            <span className="truncate max-w-[280px]">NOW PLAYING: <strong className="text-cyan-300">{djState.trackName || 'None'}</strong></span>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-xl border-t border-x transition flex items-center gap-2 ${
              activeTab === 'list'
                ? 'bg-slate-900 border-cyan-500/50 text-cyan-300'
                : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🎵 Song List ({tracksList.length})
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-xl border-t border-x transition flex items-center gap-2 ${
              activeTab === 'custom'
                ? 'bg-slate-900 border-cyan-500/50 text-cyan-300'
                : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🔗 Custom Link (Google Drive / Audio)
          </button>
        </div>

        {/* Main Tab Contents */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-4">
          {activeTab === 'list' ? (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs text-slate-400 font-semibold uppercase tracking-wider">
                <span>Select Song from List</span>
                <span className="text-slate-500 font-normal">Click song to select & play</span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {tracksList.map((track) => {
                  const isSelected = selectedTrackId === track.id;
                  const isCurrentPlaying = djState.isPlaying && (djState.trackId === track.id || djState.trackName === track.name);
                  const isDriveLink = track.url && track.url.includes('drive.google.com');

                  return (
                    <div
                      key={track.id}
                      onClick={() => setSelectedTrackId(track.id)}
                      className={`group relative flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-400/80 shadow-md shadow-cyan-500/10'
                          : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold ${
                            isCurrentPlaying
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 animate-pulse'
                              : isSelected
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                              : 'bg-slate-700/50 text-slate-400'
                          }`}
                        >
                          {isCurrentPlaying ? '▶' : '🎶'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-slate-100 truncate group-hover:text-cyan-300 transition">
                            {track.name}
                          </h4>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTrackId(track.id);
                          handlePlaySelectedTrack(track);
                        }}
                        className={`ml-3 px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          isCurrentPlaying
                            ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20'
                            : 'bg-cyan-500/20 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/40'
                        }`}
                      >
                        {isCurrentPlaying ? 'PLAYING 🔴' : 'PLAY ▶'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-200">
                💡 <strong>Google Drive Links Supported!</strong> Upload your MP3/audio files to Google Drive, get the share link, and paste it below. Google Drive links will automatically convert to streamable audio.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Song Title / Name
                </label>
                <input
                  type="text"
                  value={customLinkTitle}
                  onChange={(e) => setCustomLinkTitle(e.target.value)}
                  placeholder="e.g. My Favorite Song"
                  className="w-full bg-slate-800 border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Audio Link (Google Drive / Web URL / MP3)
                </label>
                <input
                  type="text"
                  value={customLinkUrl}
                  onChange={(e) => setCustomLinkUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/... or https://example.com/song.mp3"
                  className="w-full bg-slate-800 border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-2 text-sm text-slate-100 font-mono text-xs focus:outline-none transition"
                />
                {customLinkUrl && customLinkUrl.includes('drive.google.com') && (
                  <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                    ✓ Google Drive link detected! Converted URL: <code className="bg-slate-950 px-1 py-0.5 rounded text-[10px] text-cyan-300">{formatAudioUrl(customLinkUrl)}</code>
                  </p>
                )}
              </div>

              <button
                onClick={handlePlayCustomLink}
                disabled={!customLinkUrl.trim()}
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-sm shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 transition"
              >
                ▶ PLAY CUSTOM LINK TO ROOM
              </button>
            </div>
          )}

          {/* Volume Control Slider */}
          <div className="mt-2 pt-3 border-t border-slate-800">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <span>Master DJ Deck Volume</span>
              <span className="text-cyan-400 font-mono font-bold">{Math.round(volume * 100)}%</span>
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

          {/* Master Control Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {!djState.isPlaying ? (
              <button
                onClick={() => handlePlaySelectedTrack()}
                className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold tracking-wide shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 transition active:scale-95"
              >
                ▶ PLAY SELECTED SONG TO ROOM
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold tracking-wide shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition active:scale-95"
              >
                ⏸ PAUSE BROADCAST
              </button>
            )}

            <button
              onClick={() => {
                onUpdateState({
                  isPlaying: false,
                  trackId: PRESET_TRACKS[0]?.id || 'none',
                  trackName: PRESET_TRACKS[0]?.name || 'None',
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

