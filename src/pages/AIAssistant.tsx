import { FormEvent, useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  LoaderCircle,
  Send,
  Sparkles,
  UserRound,
  MessageSquarePlus,
  History,
  MessageSquare,
  MapPin,
  Download,
  Filter,
  Layers,
  Sparkle
} from 'lucide-react';
import { api, type AiChatHistoryItem, type AiChatResponse } from '../services/api';

type ChatItem = {
  id: string;
  threadId: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  level?: 'low' | 'medium' | 'high';
  weather?: AiChatResponse['weatherSummary'];
  model?: string;
  crop?: string;
};

const QUICK_PROMPTS = [
  'Best crop for my soil',
  'Fertilizer recommendation',
  'Weather advice',
  'Pest prevention',
  'Disease detection',
];

function readPrimaryCrop() {
  try {
    const raw = localStorage.getItem('farmerProfile');
    if (!raw) return '';
    const profile = JSON.parse(raw) as { crops?: string };
    return profile.crops?.split(',')[0]?.trim() || '';
  } catch {
    return '';
  }
}

function readFarmerName() {
  try {
    const raw = localStorage.getItem('farmerProfile');
    if (!raw) return 'Farmer';
    const profile = JSON.parse(raw) as { name?: string };
    return profile.name || 'Farmer';
  } catch {
    return 'Farmer';
  }
}

function mapHistory(history: AiChatHistoryItem[]) {
  const rows: ChatItem[] = [];
  [...history].reverse().forEach((item) => {
    rows.push({
      id: `${item.id}-q`,
      threadId: item.id,
      role: 'user',
      text: item.question,
      createdAt: item.createdAt,
    });
    rows.push({
      id: `${item.id}-a`,
      threadId: item.id,
      role: 'assistant',
      text: item.answer,
      createdAt: item.createdAt,
      level: (item.metadata?.level as 'low' | 'medium' | 'high') || 'low',
      weather: item.weatherSummary || null,
      model: item.model,
      crop: typeof item.metadata?.crop === 'string' ? String(item.metadata.crop) : '',
    });
  });
  return rows;
}

function downloadTextFile(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function AIAssistant() {
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');

  const [liveMessages, setLiveMessages] = useState<ChatItem[]>([]);
  const [historyMessages, setHistoryMessages] = useState<ChatItem[]>([]);

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [severityFilter, setSeverityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [cropFilter, setCropFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const primaryCrop = useMemo(() => readPrimaryCrop(), []);
  const farmerName = useMemo(() => readFarmerName(), []);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveMessages, loading, activeTab]);

  // Initialize live chat with a greeting
  useEffect(() => {
    setLiveMessages([
      {
        id: 'initial-greeting',
        threadId: 'initial-greeting',
        role: 'assistant',
        text: `Hello ${farmerName}. I am your agricultural AI assistant. How can I assist your farming today?`,
        createdAt: new Date().toISOString(),
      },
    ]);
  }, [farmerName]);

  const assistantRows = useMemo(() => historyMessages.filter((item) => item.role === 'assistant'), [historyMessages]);

  const cropOptions = useMemo(() => {
    const set = new Set<string>();
    assistantRows.forEach((item) => {
      const value = String(item.crop || '').trim();
      if (value) {
        set.add(value.toLowerCase());
      }
    });
    return ['all', ...Array.from(set)];
  }, [assistantRows]);

  const filteredThreadIds = useMemo(() => {
    const fromTs = fromDate ? Date.parse(`${fromDate}T00:00:00`) : null;
    const toTs = toDate ? Date.parse(`${toDate}T23:59:59`) : null;
    const ids = new Set<string>();

    assistantRows.forEach((row) => {
      if (severityFilter !== 'all' && row.level !== severityFilter) return;
      if (cropFilter !== 'all' && String(row.crop || '').toLowerCase() !== cropFilter) return;
      const rowTs = Date.parse(row.createdAt);
      if (fromTs && rowTs < fromTs) return;
      if (toTs && rowTs > toTs) return;
      ids.add(row.threadId);
    });

    return ids;
  }, [assistantRows, severityFilter, cropFilter, fromDate, toDate]);

  const hasActiveFilters = severityFilter !== 'all' || cropFilter !== 'all' || Boolean(fromDate) || Boolean(toDate);

  const visibleHistoryMessages = useMemo(
    () => (hasActiveFilters ? historyMessages.filter((item) => filteredThreadIds.has(item.threadId)) : historyMessages),
    [hasActiveFilters, filteredThreadIds, historyMessages],
  );

  const exportRows = useMemo(
    () =>
      assistantRows
        .filter((row) => (!hasActiveFilters ? true : filteredThreadIds.has(row.threadId)))
        .map((row) => ({
          threadId: row.threadId,
          createdAt: row.createdAt,
          crop: row.crop || '',
          level: row.level || '',
          model: row.model || '',
          answer: row.text,
        })),
    [assistantRows, filteredThreadIds, hasActiveFilters],
  );

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setCoords(null);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 600000 },
    );
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await api.getAiHistory(50);
      setHistoryMessages(mapHistory(response.history));
    } catch {
      setHistoryMessages([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      void loadHistory();
    }
  }, [activeTab]);

  const sendPrompt = async (value: string) => {
    const text = value.trim();
    if (!text || loading) return;

    setError('');
    setLoading(true);

    if (activeTab !== 'chat') {
      setActiveTab('chat');
    }

    const userRow: ChatItem = {
      id: `user-${Date.now()}`,
      threadId: `thread-${Date.now()}`,
      role: 'user',
      text,
      createdAt: new Date().toISOString(),
    };
    setLiveMessages((prev) => [...prev, userRow]);
    setPrompt('');

    try {
      const response = await api.askAi({
        query: text,
        lat: coords?.lat,
        lng: coords?.lng,
        crop: primaryCrop || undefined,
      });

      const aiRow: ChatItem = {
        id: response.id ? `${response.id}-a` : `assistant-${Date.now()}`,
        threadId: userRow.threadId,
        role: 'assistant',
        text: response.answer,
        createdAt: response.generatedAt,
        level: response.level,
        weather: response.weatherSummary,
        model: response.model,
        crop: primaryCrop || '',
      };
      setLiveMessages((prev) => [...prev, aiRow]);

      // Optionally reload history silently so it's fresh if they switch tabs
      void loadHistory();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to fetch AI answer right now.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendPrompt(prompt);
  };

  const handleNewChat = () => {
    setLiveMessages([
      {
        id: `greeting-${Date.now()}`,
        threadId: `greeting-${Date.now()}`,
        role: 'assistant',
        text: `Hello ${farmerName}. I am your agricultural AI assistant. How can I assist your farming today?`,
        createdAt: new Date().toISOString(),
      },
    ]);
    setActiveTab('chat');
  };

  const exportAsJson = () => {
    const payload = JSON.stringify(exportRows, null, 2);
    downloadTextFile(`ai-chat-export-${new Date().toISOString().slice(0, 10)}.json`, 'application/json', payload);
  };

  const exportAsCsv = () => {
    const header = ['thread_id', 'created_at', 'crop', 'severity', 'model', 'answer'];
    const escape = (value: string) => `"${String(value || '').replace(/"/g, '""')}"`;
    const rows = exportRows.map((item) =>
      [item.threadId, item.createdAt, item.crop, item.level, item.model, item.answer]
        .map((value) => escape(String(value)))
        .join(','),
    );
    downloadTextFile(
      `ai-chat-export-${new Date().toISOString().slice(0, 10)}.csv`,
      'text/csv;charset=utf-8',
      [header.join(','), ...rows].join('\n'),
    );
  };

  return (
    <div
      className="relative -m-4 md:-m-6 lg:-m-8 p-4 md:p-8 lg:p-10 min-h-[calc(100vh-4rem)] flex flex-col bg-no-repeat bg-cover text-white rounded-2xl overflow-hidden font-sans"
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(4,16,24,0.28) 0%, rgba(4,16,24,0.14) 50%, rgba(4,16,24,0.04) 100%), radial-gradient(ellipse at 30% 40%, rgba(6,26,35,0.30) 0%, rgba(4,15,22,0.72) 100%), url('/assets/storm-background.jpg')`,
        backgroundPosition: 'center 25%',
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
      }}
    >
      <div className="relative z-10 mx-auto max-w-6xl w-full flex-1 flex flex-col space-y-5 animate-fade-in">
        {/* ═══ Header Section ═══ */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-white/10">
          <div>
            <div className="aurora-glass-pill mb-1.5">
              <span>Smart Farming Swarm</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-white/95 tracking-tight">
              AI Farming Assistant
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            {coords && (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/18 text-xs text-white/80 backdrop-blur-md">
                <MapPin size={12} className="text-emerald-300" />
                <span>
                  {coords.lat.toFixed(2)}, {coords.lng.toFixed(2)}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={handleNewChat}
              className="aurora-glass-button text-xs sm:text-sm font-medium"
              title="Start a new chat session"
            >
              <MessageSquarePlus size={15} />
              <span>New Chat</span>
            </button>
          </div>
        </div>

        {/* ═══ Navigation Tabs (Live Chat / History) ═══ */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'chat'
                ? 'bg-white/20 border border-white/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.40)] backdrop-blur-md'
                : 'text-white/60 hover:text-white hover:bg-white/10 border border-transparent'
            }`}
          >
            <MessageSquare size={14} />
            <span>Live Chat</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'history'
                ? 'bg-white/20 border border-white/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.40)] backdrop-blur-md'
                : 'text-white/60 hover:text-white hover:bg-white/10 border border-transparent'
            }`}
          >
            <History size={14} />
            <span>Chat History</span>
          </button>
        </div>

        {/* ═══ History Filters Card (when in history mode) ═══ */}
        {activeTab === 'history' && (
          <div className="aurora-glass-medium p-5 rounded-[24px] space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
              <label className="text-xs text-white/70 font-medium">
                Severity
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value as 'all' | 'low' | 'medium' | 'high')}
                  className="aurora-glass-input mt-1 text-xs py-2"
                >
                  <option value="all" className="bg-[#04121b] text-white">All</option>
                  <option value="high" className="bg-[#04121b] text-white">High</option>
                  <option value="medium" className="bg-[#04121b] text-white">Medium</option>
                  <option value="low" className="bg-[#04121b] text-white">Low</option>
                </select>
              </label>

              <label className="text-xs text-white/70 font-medium">
                Crop
                <select
                  value={cropFilter}
                  onChange={(e) => setCropFilter(e.target.value)}
                  className="aurora-glass-input mt-1 text-xs py-2"
                >
                  {cropOptions.map((item) => (
                    <option key={item} value={item} className="bg-[#04121b] text-white">
                      {item === 'all' ? 'All crops' : item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-white/70 font-medium">
                From
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="aurora-glass-input mt-1 text-xs py-2"
                />
              </label>

              <label className="text-xs text-white/70 font-medium">
                To
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="aurora-glass-input mt-1 text-xs py-2"
                />
              </label>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={exportAsJson}
                  disabled={!exportRows.length}
                  className="aurora-glass-button text-xs flex-1 py-2"
                >
                  <Download size={13} />
                  <span>JSON</span>
                </button>
                <button
                  type="button"
                  onClick={exportAsCsv}
                  disabled={!exportRows.length}
                  className="aurora-glass-button text-xs flex-1 py-2"
                >
                  <Download size={13} />
                  <span>CSV</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Main Chat Workspace Surface (Strong Glass) ═══ */}
        <div className="aurora-glass-strong flex-1 min-h-[480px] p-5 sm:p-7 rounded-[26px] flex flex-col justify-between overflow-hidden relative">
          {/* Top Quick Suggestions (in Live Chat) */}
          {activeTab === 'chat' && (
            <div className="mb-4 flex flex-wrap gap-2 shrink-0 pb-3 border-b border-white/10">
              {QUICK_PROMPTS.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => void sendPrompt(sample)}
                  className="aurora-glass-pill text-xs hover:bg-white/20 transition-all duration-200 cursor-pointer"
                >
                  <Sparkle size={11} className="text-emerald-300" />
                  <span>{sample}</span>
                </button>
              ))}
            </div>
          )}

          {/* Conversation Message Feed */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[50vh]">
            {activeTab === 'history' && loadingHistory && (
              <div className="aurora-glass-light p-4 rounded-xl text-sm text-white/75 flex items-center gap-2">
                <LoaderCircle size={16} className="animate-spin text-emerald-300" />
                <span>Loading past sessions...</span>
              </div>
            )}

            {activeTab === 'history' && !loadingHistory && (
              visibleHistoryMessages.length ? (
                visibleHistoryMessages.map((item) => <ChatMessage key={item.id} item={item} />)
              ) : (
                <div className="aurora-glass-light p-4 rounded-xl text-sm text-white/70 text-center">
                  {hasActiveFilters ? 'No past chats match these filters.' : 'You have no chat history yet.'}
                </div>
              )
            )}

            {activeTab === 'chat' && (
              liveMessages.map((item) => <ChatMessage key={item.id} item={item} />)
            )}

            {activeTab === 'chat' && loading && (
              <motion.article
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 justify-start items-start"
              >
                <div className="mt-1 rounded-full bg-white/15 border border-white/25 text-white p-2 h-9 w-9 flex items-center justify-center shrink-0 backdrop-blur-md">
                  <Bot size={18} className="text-emerald-300" />
                </div>
                <div className="aurora-glass-light px-5 py-3.5 rounded-2xl rounded-tl-sm flex items-center gap-2 h-11">
                  <span className="h-2 w-2 bg-emerald-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 bg-emerald-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 bg-emerald-300 rounded-full animate-bounce" />
                </div>
              </motion.article>
            )}
            <div ref={messagesEndRef} className="h-2" />
          </div>

          {/* Error Notice */}
          {error && (
            <div className="mt-3 shrink-0 aurora-card p-3 border-rose-400/30 bg-rose-500/15 text-rose-200 text-xs">
              {error}
            </div>
          )}

          {/* Chat Floating Input Area */}
          <form onSubmit={onSubmit} className="mt-4 pt-3 border-t border-white/10 shrink-0 flex flex-col gap-2.5 sm:flex-row">
            <label className="sr-only" htmlFor="ai-query">
              Ask AI
            </label>
            <input
              id="ai-query"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask about crop, weather, disease, fertilizer, or market timing..."
              className="aurora-glass-input flex-1 text-sm py-3 px-4"
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="aurora-glass-button-primary whitespace-nowrap text-xs sm:text-sm font-semibold px-6 py-3"
            >
              {loading ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
              <span>{loading ? 'Thinking...' : 'Ask AI'}</span>
            </button>
          </form>

          {/* Subtext */}
          <p className="mt-2.5 shrink-0 flex items-center justify-center gap-1.5 text-[11px] text-white/50">
            <Sparkles size={12} className="text-emerald-300/80" />
            <span>AI agricultural guidance. Always verify local field conditions before applying inputs.</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ item }: { item: ChatItem }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-3 ${item.role === 'user' ? 'justify-end' : 'justify-start'} items-start`}
    >
      {item.role === 'assistant' && (
        <div className="mt-1 rounded-full bg-white/15 border border-white/25 text-white p-2 h-8 w-8 flex items-center justify-center shrink-0 backdrop-blur-md shadow-sm">
          <Bot size={16} className="text-emerald-300" />
        </div>
      )}

      <div
        className={`max-w-[82%] sm:max-w-[76%] rounded-2xl px-4 sm:px-5 py-3.5 text-sm leading-relaxed ${
          item.role === 'user'
            ? 'bg-white/20 border border-white/25 text-white rounded-tr-sm backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.30)]'
            : 'aurora-glass-medium text-white/95 rounded-tl-sm'
        }`}
      >
        <p className="whitespace-pre-wrap leading-relaxed text-white/92 text-[13.5px]">{item.text}</p>

        {item.role === 'assistant' && item.weather && (
          <div className="mt-2.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs text-white/80 border border-white/15 flex items-center gap-1.5">
            <span className="text-emerald-300 font-semibold">Context:</span>
            <span>
              {item.weather.city}, {item.weather.tempC}°C, Rain chance {item.weather.rainChance24h}%
            </span>
          </div>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[10.5px] font-medium text-white/55">
          {item.level && (
            <span
              className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-wider ${
                item.level === 'high'
                  ? 'aurora-badge-danger'
                  : item.level === 'medium'
                  ? 'aurora-badge-warning'
                  : 'aurora-badge-success'
              }`}
            >
              {item.level} alert
            </span>
          )}
          {item.model && (
            <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-white/70">
              Model: {item.model}
            </span>
          )}
          <span>
            {new Date(item.createdAt).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      {item.role === 'user' && (
        <div className="mt-1 rounded-full bg-white/15 border border-white/25 text-white p-2 h-8 w-8 flex items-center justify-center shrink-0 backdrop-blur-md shadow-sm">
          <UserRound size={16} className="text-white/85" />
        </div>
      )}
    </motion.article>
  );
}

