import React, { useState, useEffect, useRef } from 'react';
import { Users, MessageSquare, Send, Smile, Volume2, VolumeX, Mic, X } from 'lucide-react';
import type { Player, ChatMessage } from '../../types/game';

interface ChatAndPlayersProps {
  localPlayer: Player;
  players: Player[];
  messages: ChatMessage[];
  maxAudioDistance: number;
  isOpen: boolean;
  onToggle: () => void;
  onSendMessage: (text: string) => void;
  onSendEmote: (emoji: string) => void;
}

const EMOJIS = ['👋', '💬', '😂', '❤️', '🔊', '🚀', '😱', '👍'];

export const ChatAndPlayers: React.FC<ChatAndPlayersProps> = ({
  localPlayer,
  players,
  messages,
  maxAudioDistance,
  isOpen,
  onToggle,
  onSendMessage,
  onSendEmote,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'players'>('chat');
  const [chatText, setChatText] = useState('');
  const [showEmotes, setShowEmotes] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto focus input when chat opens
  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, activeTab]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    onSendMessage(chatText.trim());
    setChatText('');
  };

  return (
    <div className="absolute top-4 left-4 z-20 font-sans select-none">
      {!isOpen ? (
        <button
          type="button"
          onClick={onToggle}
          className="px-3.5 py-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 backdrop-blur-md rounded-2xl text-slate-200 text-xs font-semibold shadow-2xl transition-all flex items-center gap-2.5 cursor-pointer transform hover:scale-105"
          title="Press '/' to open chat"
        >
          <div className="relative">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
            )}
          </div>
          <span>Chat & Crew</span>
          <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-slate-400 font-bold">
            /
          </kbd>
        </button>
      ) : (
        <div className="flex flex-col w-80 sm:w-84 max-h-[calc(100vh-140px)] bg-slate-900/95 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 p-1.5 gap-1">
            <div className="flex flex-1 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('players')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'players'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Crew ({players.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onToggle}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors shrink-0 cursor-pointer ml-1"
              title="Close panel (/)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-3 min-h-[220px] max-h-[340px] space-y-2.5">
            {activeTab === 'chat' ? (
              <div className="space-y-2">
                {messages.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-8">
                    No chat messages yet. Type below to chat with crewmates!
                  </p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold flex items-center gap-1.5" style={{ color: msg.senderColor }}>
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: msg.senderColor }}
                          />
                          {msg.senderName}
                        </span>
                        <span className="text-slate-500 text-[10px]">{msg.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed break-words">{msg.text}</p>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {players.map((p) => {
                  const isMe = p.id === localPlayer.id;
                  const dist = Math.hypot(
                    p.position.x - localPlayer.position.x,
                    p.position.y - localPlayer.position.y
                  );
                  const inRange = dist <= maxAudioDistance;

                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: p.color || '#3b82f6' }}
                        />
                        <div>
                          <div className="font-bold text-slate-200 flex items-center gap-1">
                            {p.name}
                            {isMe && <span className="text-[10px] text-blue-400 font-normal">(You)</span>}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {isMe ? 'Local Player' : `${Math.round(dist / 10)}m away`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {p.isMuted ? (
                          <span title="Muted"><VolumeX className="w-3.5 h-3.5 text-rose-500" /></span>
                        ) : p.isTalking ? (
                          <span title="Talking"><Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /></span>
                        ) : (
                          <span title="Silent"><Volume2 className="w-3.5 h-3.5 text-slate-600" /></span>
                        )}

                        {!isMe && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              inRange
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {inRange ? 'IN VOICE' : 'OUT'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Controls */}
          {activeTab === 'chat' && (
            <div className="p-2.5 border-t border-slate-800 bg-slate-950/80 space-y-2">
              {showEmotes && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onSendEmote(emoji);
                        setShowEmotes(false);
                      }}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-base transition-transform transform hover:scale-125 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleSendChat} className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowEmotes(!showEmotes)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
                  title="Quick Emotes"
                >
                  <Smile className="w-4 h-4 text-amber-400" />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Send chat message... (Press Esc to exit)"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />

                <button
                  type="submit"
                  className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
