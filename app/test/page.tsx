'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/public/src/utils/supabase';
import FridaySidebar from '../components/friday/FridaySidebar';
import VoiceModal from '../components/friday/VoiceModal';
import MessageList from '../components/friday/MessageList';

// ── Component Imports ─────────────────────────────────────────────────────────
import Sidebar from '../components/ai/Sidebar';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  persona?: string;
  audioUrl?: string; // blob URL for TTS audio
}

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  memory_summary?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
  avatar_url?: string | null;
}

// ─── HELPERS ──────────────────────────────────────────────────────────…

function getUserDisplayName(profile: UserProfile | null): string {
  if (!profile) return 'there';
  return profile.name || profile.email?.split('@')[0] || 'there';
}

// ─── ICONS ───────────────────────────────────────────────────────────[...]

const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const MicIcon = ({ active, recording }: { active?: boolean; recording?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={active || recording ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const VolumeIcon = ({ muted }: { muted?: boolean }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    {!muted && <><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></>}
    {muted && <line x1="23" y1="9" x2="17" y2="15"/>}
  </svg>
);

const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const StopIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
);

// ─── MAIN PAGE ─────────────────────────────────────────────────────────…

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function AIChat() {
  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [memorySummary, setMemorySummary] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);

  // Voice / recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [mutedMessages, setMutedMessages] = useState<Set<string>>(new Set());

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // ─── INIT ──────────────────────────────────────────────────────────…

  useEffect(() => {
    loadUserProfile();
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // ─── SUPABASE ─────────────────────────────────────────────────────────…

  const loadUserProfile = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) { console.warn('No authenticated user found'); return; }

      const { data, error } = await supabase
        .from('users')
        .select("id, email, name, avatar_url")
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) setUserProfile(data);
    } catch (err) {
      console.error('Error loading user profile:', err);
      setError('Failed to load user profile');
    }
  };

  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('friday_conversations')
        .select('id, title, updated_at, memory_summary')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(30);
      if (data) setConversations(data);
    } catch (err) { console.error(err); }
  };

  const loadConversation = async (convId: string) => {
    try {
      const { data } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at),
        })));
      }

      const conv = conversations.find(c => c.id === convId);
      if (conv?.memory_summary) setMemorySummary(conv.memory_summary);

      setActiveConversationId(convId);
    } catch (err) { console.error(err); }
  };

  const createNewConversation = async (firstMessage: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const title = firstMessage.slice(0, 60) + (firstMessage.length > 60 ? '...' : '');
      const { data } = await supabase.from('friday_conversations').insert({ user_id: user.id, title, memory_summary: '' }).select().single();
      if (data) {
        setConversations(prev => [data, ...prev]);
        return data.id;
      }
      return null;
    } catch (err) { console.error(err); return null; }
  };

  const saveMessage = async (convId: string, role: 'user' | 'assistant', content: string) => {
    try {
      await supabase.from('ai_messages').insert({ conversation_id: convId, role, content });
    } catch (err) { console.error(err); }
  };

  const updateMemorySummary = async (convId: string, allMessages: Message[], newContent: string) => {
    // Build rolling memory summary via API
    try {
      const response = await fetch('/api/friday/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentSummary: memorySummary,
          recentMessages: allMessages.slice(-6).map(m => ({ role: m.role, content: m.content })),
          latestResponse: newContent,
          userName: getUserDisplayName(userProfile),
        }),
      });
      if (response.ok) {
        const { summary } = await response.json();
        setMemorySummary(summary);
        await supabase.from('friday_conversations').update({ memory_summary: summary }).eq('id', convId);
      }
    } catch (err) { console.error('Memory update error:', err); }
  };

  const deleteConversation = async (convId: string) => {
    try {
      await supabase.from('ai_messages').delete().eq('conversation_id', convId);
      await supabase.from('ai_conversations').delete().eq('id', convId);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConversationId === convId) {
        setActiveConversationId(null);
        setMessages([]);
        setMemorySummary('');
      }
    } catch (err) { console.error(err); }
  };

  // ─── SEND ──────────────────────────────────────────────────────────…

  const handleSend = useCallback(async (overrideInput?: string) => {
    const trimmed = (overrideInput ?? input).trim();
    if (!trimmed || isLoading) return;

    setError(null);

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    let convId = activeConversationId;
    if (!convId) {
      convId = await createNewConversation(trimmed);
      if (convId) setActiveConversationId(convId);
    }

    if (convId) await saveMessage(convId, 'user', trimmed);

    try {
      abortControllerRef.current = new AbortController();
      const response = await fetch('/api/friday/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversationId: convId,
          personaId: selectedPersona.id,
          personaName: selectedPersona.name,
          personaSystemPrompt: selectedPersona.systemPrompt,
          history: messages.slice(-12).map(m => ({ role: m.role, content: m.content })),
          userName: userProfile?.name || null,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      let accumulated = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content' && parsed.content) {
                accumulated += parsed.content;
                setStreamingContent(accumulated);
              } else if (parsed.content) {
                accumulated += parsed.content;
                setStreamingContent(accumulated);
              }
            } catch {}
          }
        }
      }

      // Fetch TTS audio for AI response
      let audioUrl: string | undefined;
      try {
        const ttsRes = await fetch('https://rookie-backend.vercel.app/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: accumulated }),
        });
        if (ttsRes.ok) {
          const audioBlob = await ttsRes.blob();
          audioUrl = URL.createObjectURL(audioBlob);
        }
      } catch (ttsErr) {
        console.error('TTS error:', ttsErr);
      }

      const aiMsgId = crypto.randomUUID();
      const aiMsg: Message = {
        id: aiMsgId,
        role: 'assistant',
        content: accumulated,
        timestamp: new Date(),
        persona: selectedPersona.name,
        audioUrl,
      };

      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);
      setStreamingContent('');

      // Auto-play AI audio
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audioElementsRef.current.set(aiMsgId, audio);
        audio.play().catch(() => {});
      }

      if (convId && accumulated) {
        await saveMessage(convId, 'assistant', accumulated);
        await supabase.from('ai_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', convId);
      }

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Chat error:', err);
        setError(err.message || 'Something went wrong.');
      }
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  }, [input, isLoading, activeConversationId, messages, selectedPersona, userProfile]);

  const handleStop = () => {
    abortControllerRef.current?.abort();
    if (streamingContent) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: streamingContent,
        timestamp: new Date(),
      }]);
    }
    setStreamingContent('');
    setIsLoading(false);
  };

  // ─── VOICE RECORDING ──────────────────────────────────────────────────────

  /**
   * Toggle recording:
   * - First press  → request mic permission → start MediaRecorder
   * - Second press → stop recording → send blob to /api/transcribe → setInput with transcript
   */
  const handleVoiceInput = useCallback(async () => {
    // ── Stop recording ────────────────────────────────────────────────────
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    // ── Start recording ───────────────────────────────────────────────────
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop all mic tracks
        stream.getTracks().forEach(t => t.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];

        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');

          const res = await fetch('https://rookie-backend.vercel.app/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) throw new Error(`Transcription failed: ${res.status}`);
          const { text } = await res.json();

          if (text?.trim()) {
            // Directly send the transcribed message
            handleSend(text.trim());
          }
        } catch (err: any) {
          console.error('Transcription error:', err);
          setError('Could not transcribe audio. Please try again.');
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow mic access in your browser.');
      } else {
        setError('Could not access microphone.');
      }
      console.error('Mic error:', err);
    }
  }, [isRecording, handleSend]);

  // ─── AUDIO MUTE TOGGLE ────────────────────────────────────────────────────

  const handleToggleMute = useCallback((msgId: string) => {
    const audio = audioElementsRef.current.get(msgId);
    setMutedMessages(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
        if (audio) {
          audio.muted = false;
          // Resume if paused due to mute
          audio.play().catch(() => {});
        }
      } else {
        next.add(msgId);
        if (audio) audio.muted = true;
      }
      return next;
    });
  }, []);

  // ─── COPY ─────────────────────────────────────────────────────────────────

  // ─── UI ───────────────────────────────────────────────────────────[...]

  // ─── MISC ─────────────────────────────────────────────────────────────────

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setActiveConversationId(null);
    setInput('');
    setStreamingContent('');
    setMemorySummary('');
    setError(null);
    inputRef.current?.focus();
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  const handleLoadConversation = useCallback(loadConversation, [conversations]);
  const handleToggleHistory = useCallback(() => setHistoryOpen(o => !o), []);
  const handleOpenPersonaModal = useCallback(() => setShowPersonaModal(true), []);
  const handleSidebarCollapse = useCallback(() => {
    setSidebarOpen(false);
    setMobileSidebarOpen(false);
  }, []);

  const userName = getUserDisplayName(userProfile);
  const isEmptyState = messages.length === 0 && !streamingContent;

  return (
    <div className="flex h-screen bg-[#000000] text-white overflow-hidden font-['Inter',sans-serif]">

      {/* DESKTOP SIDEBAR */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="hidden md:block flex-shrink-0 bg-[#000000] border-r border-white/5 overflow-hidden"
          >
            <Sidebar
              conversations={conversations}
              activeConversationId={activeConversationId}
              selectedPersona={selectedPersona}
              userProfile={userProfile}
              historyOpen={historyOpen}
              showPersonaModal={showPersonaModal}
              onNewChat={handleNewChat}
              onLoadConversation={handleLoadConversation}
              onDeleteConversation={deleteConversation}
              onToggleHistory={handleToggleHistory}
              onOpenPersonaModal={handleOpenPersonaModal}
              onCollapse={handleSidebarCollapse}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* MOBILE SIDEBAR */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black z-40"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-[260px] bg-[#000000] border-r border-white/5 z-50"
            >
              <Sidebar
                conversations={conversations}
                activeConversationId={activeConversationId}
                selectedPersona={selectedPersona}
                userProfile={userProfile}
                historyOpen={historyOpen}
                showPersonaModal={showPersonaModal}
                onNewChat={handleNewChat}
                onLoadConversation={handleLoadConversation}
                onDeleteConversation={deleteConversation}
                onToggleHistory={handleToggleHistory}
                onOpenPersonaModal={handleOpenPersonaModal}
                onCollapse={handleSidebarCollapse}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#000000]">

        {/* Top bar */}
        <header className="flex items-center justify-between px-4 h-12 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSidebarOpen(o => !o); setMobileSidebarOpen(o => !o); }}
              className="text-[#666] hover:text-white transition-colors p-1"
            >
              {sidebarOpen ? <CollapseIcon /> : <MenuIcon />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Recording status indicator */}
            {isRecording && (
              <motion.div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500" />
                Recording…
              </motion.div>
            )}
            {isTranscribing && (
              <span className="text-xs text-[#666] px-3">Transcribing…</span>
            )}
          </div>
        </header>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="px-4 py-3 bg-red-500/10 border-t border-b border-red-500/20 text-red-300 text-sm flex items-center justify-between"
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 ml-4">✕</button>
          </motion.div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6" style={{ scrollbarWidth: 'none' }}>
          {messages.length === 0 && !isLoading && (
            <div ref={logoRef} className="flex flex-col items-center justify-center h-full gap-6 opacity-0">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: `${accentColor}22`, border: `1px solid ${accentColor}44` }}
              >
                {selectedPersona.avatar}
              </div>
              <div className="text-center max-w-xs">
                <p className="text-white font-semibold text-lg mb-1">{selectedPersona.name}</p>
                <p className="text-[#555] text-sm">{selectedPersona.greeting}</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                {['What can you help me with?', 'Tell me about yourself', "Let's chat"].map(s => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <MessageList
              messages={messages}
              streamingContent={streamingContent}
              isLoading={isLoading}
              onSpeak={handleSpeak}
              isSpeaking={isSpeaking}
            />
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="friday-error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              <div className="flex-shrink-0 mt-1">
                {msg.role === 'assistant' ? (
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                    style={{ background: `${accentColor}22`, border: `1px solid ${accentColor}33` }}
                  >
                    {selectedPersona.avatar}
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-white/10 overflow-hidden">
                    {userProfile?.avatar_url ? (
                      <Image src={userProfile.avatar_url} alt="You" width={32} height={32} className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                        {getAvatarInitial()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={`flex flex-col gap-1 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.role === 'assistant' && (
                  <span className="text-[10px] text-[#444] px-1">{msg.persona || selectedPersona.name}</span>
                )}
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-white/10 text-white rounded-tr-sm border border-white/10'
                      : 'bg-[#161616] text-[#e0e0e0] rounded-tl-sm border border-white/5'
                  }`}
                >
                  {msg.content}
                </div>
                <div className={`flex items-center gap-2 px-1 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className="text-[10px] text-[#333]">{formatTime(msg.timestamp)}</span>
                  {msg.role === 'assistant' && (
                    <>
                      {/* Mute toggle — shown only when this message has audio */}
                      {msg.audioUrl && (
                        <button
                          onClick={() => handleToggleMute(msg.id)}
                          className={`transition-colors p-0.5 ${
                            mutedMessages.has(msg.id)
                              ? 'text-[#666] hover:text-[#999]'
                              : 'text-[#FF6B35] hover:text-[#FF8C5A]'
                          }`}
                          title={mutedMessages.has(msg.id) ? 'Unmute' : 'Mute'}
                        >
                          <VolumeIcon muted={mutedMessages.has(msg.id)} />
                        </button>
                      )}
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="text-[#444] hover:text-[#999] transition-colors p-0.5"
                      >
                        {copiedId === msg.id ? <span className="text-[10px] text-green-400">Copied!</span> : <CopyIcon />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {(isLoading || streamingContent) && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-1"
                style={{ background: `${accentColor}22`, border: `1px solid ${accentColor}33` }}
              >
                {selectedPersona.avatar}
              </div>
              <div className="max-w-[80%]">
                <span className="text-[10px] text-[#444] px-1 block mb-1">{selectedPersona.name}</span>
                <div className="bg-[#161616] border border-white/5 px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-[#e0e0e0] leading-relaxed whitespace-pre-wrap">
                  {streamingContent || <TypingIndicator color={accentColor} />}
                  {streamingContent && (
                    <motion.span
                      className="inline-block w-0.5 h-4 ml-0.5 align-middle"
                      style={{ background: accentColor }}
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input bar */}
        <div className="friday-input-wrap">
          <div className="friday-input-box">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask Friday anything..."
              rows={1}
              className="friday-textarea"
            />
            <div className="friday-input-actions">
              {/* Mic — opens voice modal */}
              <button
                className="friday-btn friday-btn--mic"
                onClick={() => setVoiceModalOpen(true)}
              >
                <MicIcon />
              </button>

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-4 py-4 border-t border-white/5 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            <div
              className="flex items-end gap-2 px-4 py-3 rounded-2xl bg-[#111] border border-white/10 focus-within:border-white/20 transition-all"
              style={{ boxShadow: `0 0 0 1px ${accentColor}00` }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder={
                  isRecording
                    ? 'Recording… tap mic to stop'
                    : isTranscribing
                    ? 'Transcribing…'
                    : `Message ${selectedPersona.name}...`
                }
                rows={1}
                className="flex-1 bg-transparent text-white text-sm placeholder-[#444] resize-none outline-none leading-relaxed"
                style={{ minHeight: '24px', maxHeight: '160px' }}
              />
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Mic button — red when recording */}
                <button
                  onClick={handleVoiceInput}
                  disabled={isTranscribing}
                  className={`p-1.5 transition-colors ${
                    isRecording
                      ? 'text-red-400 hover:text-red-300'
                      : 'text-[#555] hover:text-[#999]'
                  } disabled:opacity-40`}
                  title={isRecording ? 'Stop recording' : 'Record voice message'}
                >
                  <MicIcon recording={isRecording} />
                </button>

                {isLoading ? (
                  <button
                    onClick={handleStop}
                    className="p-2 rounded-xl text-[#999] hover:text-white hover:bg-white/10 transition-all"
                  >
                    <StopIcon />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim()}
                    className="p-2 rounded-xl text-white transition-all disabled:opacity-30"
                    style={{ background: input.trim() ? accentColor : 'transparent' }}
                  >
                    <SendIcon />
                  </button>
                )}
              </div>
            </div>
            <p className="text-center text-[#2a2a2a] text-[10px] mt-2">
              {selectedPersona.name} remembers your conversations · Tap mic to speak
            </p>
          </div>
          <p className="friday-input-hint">Friday may make mistakes. Verify important info.</p>
        </div>
      </div>

      {/* Voice Modal */}
      <AnimatePresence>
        {voiceModalOpen && (
          <VoiceModal
            onClose={() => setVoiceModalOpen(false)}
            onSubmit={handleVoiceSubmit}
          />
        )}
      </AnimatePresence>

      <style>{STYLES}</style>
    </div>
  );
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const SUGGESTIONS = [
  'Summarize my schedule for today',
  'Research the latest AI breakthroughs',
  'Help me draft a professional email',
  'What should I focus on this week?',
];

const STYLES = `
  :root {
    --friday-bg: #080808;
    --friday-surface: #0e0e0e;
    --friday-border: rgba(255,255,255,0.07);
    --friday-accent: #e8c97e;
    --friday-accent-dim: rgba(232,201,126,0.12);
    --friday-accent-glow: rgba(232,201,126,0.3);
    --friday-text: #f0ece4;
    --friday-muted: #5a5650;
    --friday-sidebar-w: 260px;
    --friday-transition: 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .friday-root {
    display: flex;
    height: 100dvh;
    background: var(--friday-bg);
    color: var(--friday-text);
    font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
    overflow: hidden;
  }

  /* ── MAIN ─────────────────────────────── */
  .friday-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: margin-left var(--friday-transition);
  }

  /* ── HEADER ───────────────────────────── */
  .friday-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--friday-border);
    flex-shrink: 0;
  }
  .friday-header__menu {
    background: none;
    border: none;
    color: var(--friday-muted);
    cursor: pointer;
    padding: 6px;
    border-radius: 8px;
    transition: color 0.2s, background 0.2s;
    display: flex;
    align-items: center;
  }
  .friday-header__menu:hover { color: var(--friday-text); background: rgba(255,255,255,0.05); }
  .friday-header__brand {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .friday-header__dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--friday-accent);
    box-shadow: 0 0 8px var(--friday-accent-glow);
    animation: pulse-dot 2s ease-in-out infinite;
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; box-shadow: 0 0 8px var(--friday-accent-glow); }
    50% { opacity: 0.6; box-shadow: 0 0 16px var(--friday-accent-glow); }
  }
  .friday-header__name {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.15em;
    color: var(--friday-accent);
  }
  .friday-header__status { margin-left: auto; }
  .friday-speaking-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: var(--friday-accent-dim);
    border: 1px solid rgba(232,201,126,0.2);
    border-radius: 20px;
    font-size: 11px;
    color: var(--friday-accent);
  }
  .friday-speaking-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--friday-accent);
    animation: pulse-dot 0.8s ease-in-out infinite;
  }

  /* ── MESSAGES ─────────────────────────── */
  .friday-messages-area {
    flex: 1;
    overflow-y: auto;
    padding: 24px 20px;
    scroll-behavior: smooth;
  }
  .friday-messages-area::-webkit-scrollbar { width: 4px; }
  .friday-messages-area::-webkit-scrollbar-track { background: transparent; }
  .friday-messages-area::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

  /* ── EMPTY STATE ──────────────────────── */
  .friday-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
    gap: 12px;
  }
  .friday-empty__orb {
    width: 80px; height: 80px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, rgba(232,201,126,0.35), rgba(232,201,126,0.05) 70%);
    border: 1px solid rgba(232,201,126,0.2);
    margin-bottom: 16px;
    animation: orb-breathe 3s ease-in-out infinite;
  }
  @keyframes orb-breathe {
    0%, 100% { transform: scale(1); box-shadow: 0 0 30px rgba(232,201,126,0.15); }
    50% { transform: scale(1.05); box-shadow: 0 0 50px rgba(232,201,126,0.25); }
  }
  .friday-empty__greeting {
    font-size: 26px;
    font-weight: 300;
    letter-spacing: -0.02em;
    color: var(--friday-text);
  }
  .friday-empty__sub {
    font-size: 14px;
    color: var(--friday-muted);
    margin-bottom: 24px;
  }
  .friday-empty__suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    max-width: 500px;
  }
  .friday-suggestion {
    background: var(--friday-surface);
    border: 1px solid var(--friday-border);
    color: #999;
    font-size: 13px;
    padding: 8px 14px;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .friday-suggestion:hover {
    border-color: rgba(232,201,126,0.3);
    color: var(--friday-accent);
    background: var(--friday-accent-dim);
  }

  /* ── ERROR ────────────────────────────── */
  .friday-error {
    margin: 0 20px 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.2);
    border-radius: 10px;
    font-size: 13px;
    color: #f87171;
  }
  .friday-error button {
    background: none; border: none; color: #f87171; cursor: pointer; opacity: 0.6;
  }

  /* ── INPUT ────────────────────────────── */
  .friday-input-wrap {
    flex-shrink: 0;
    padding: 12px 20px 16px;
    border-top: 1px solid var(--friday-border);
  }
  .friday-input-box {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    background: var(--friday-surface);
    border: 1px solid var(--friday-border);
    border-radius: 16px;
    padding: 12px 14px;
    transition: border-color 0.2s;
  }
  .friday-input-box:focus-within {
    border-color: rgba(232,201,126,0.25);
  }
  .friday-textarea {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    resize: none;
    color: var(--friday-text);
    font-size: 14px;
    line-height: 1.6;
    min-height: 24px;
    max-height: 160px;
    font-family: inherit;
  }
  .friday-textarea::placeholder { color: var(--friday-muted); }
  .friday-textarea::-webkit-scrollbar { display: none; }
  .friday-input-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .friday-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    border-radius: 10px;
  }
  .friday-btn--mic {
    width: 34px; height: 34px;
    background: rgba(255,255,255,0.05);
    color: var(--friday-muted);
  }
  .friday-btn--mic:hover {
    background: var(--friday-accent-dim);
    color: var(--friday-accent);
  }
  .friday-btn--send {
    width: 34px; height: 34px;
    background: var(--friday-accent);
    color: #1a1400;
  }
  .friday-btn--send:hover { background: #f0d484; }
  .friday-btn--send:disabled {
    background: rgba(255,255,255,0.07);
    color: var(--friday-muted);
    cursor: not-allowed;
  }
  .friday-btn--stop {
    width: 34px; height: 34px;
    background: rgba(255,255,255,0.1);
    color: var(--friday-text);
  }
  .friday-btn--stop:hover { background: rgba(255,255,255,0.15); }
  .friday-input-hint {
    font-size: 11px;
    color: var(--friday-muted);
    text-align: center;
    margin-top: 8px;
    opacity: 0.6;
  }
`;
