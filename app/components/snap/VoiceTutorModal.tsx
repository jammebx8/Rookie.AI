'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  RotateCcw,
  MessageSquare,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { renderContent } from '../renderContent';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://rookie-backend.vercel.app';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  audioBase64?: string;
}

interface VoiceTutorModalProps {
  questionText: string;
  solutionText: string;
  title?: string;
  onClose: () => void;
  isDark?: boolean;
}

type TutorState = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking';

export function VoiceTutorModal({
  questionText,
  solutionText,
  title,
  onClose,
  isDark = true,
}: VoiceTutorModalProps) {
  const [tutorState, setTutorState] = useState<TutorState>('idle');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "Hi! I'm your AI tutor. Hold or tap the microphone to ask anything about this question or solution, and I'll explain it to you!",
    },
  ]);
  const [textInput, setTextInput] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(20).fill(4));

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const currentAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, tutorState]);

  // Clean up audio context and media streams on unmount
  useEffect(() => {
    return () => {
      stopListeningCleanup();
      if (currentAudioElementRef.current) {
        currentAudioElementRef.current.pause();
      }
    };
  }, []);

  const stopListeningCleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setAudioLevels(new Array(20).fill(4));
  };

  // Start real-time microphone listening
  const startListening = async () => {
    // If currently playing audio, stop it
    if (currentAudioElementRef.current) {
      currentAudioElementRef.current.pause();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Setup Web Audio Analyser for real-time Voice Visualizer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Animate voice visualizer bars
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVisualizer = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Sample 20 frequency bars
        const levels: number[] = [];
        const step = Math.floor(dataArray.length / 20) || 1;
        for (let i = 0; i < 20; i++) {
          const val = dataArray[i * step] || 0;
          // Scale to height in pixels (4 to 48px)
          const barHeight = Math.max(4, Math.round((val / 255) * 48));
          levels.push(barHeight);
        }
        setAudioLevels(levels);
        animationFrameRef.current = requestAnimationFrame(updateVisualizer);
      };
      updateVisualizer();

      // Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/wav';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size > 0) {
          await processVoiceInput(blob, mimeType);
        } else {
          setTutorState('idle');
        }
      };

      recorder.start();
      setTutorState('listening');
    } catch (err) {
      console.error('Microphone error:', err);
      setTutorState('idle');
      alert('Microphone access is needed for the voice tutor. Please enable permissions.');
    }
  };

  // Stop listening and trigger processing
  const stopListening = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setTutorState('transcribing');
    }
  };

  // Toggle listening (for tap to talk)
  const toggleListening = () => {
    if (tutorState === 'listening') {
      stopListening();
    } else if (tutorState === 'idle' || tutorState === 'speaking') {
      startListening();
    }
  };

  // Process audio blob through Deepgram STT, then GPT-OSS-120B, then Groq TTS
  const processVoiceInput = async (audioBlob: Blob, mimeType: string) => {
    setTutorState('transcribing');

    // Convert blob to base64
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;

      try {
        // Step 1: Deepgram Nova-3 Speech to Text via rookie_backend
        const sttResp = await fetch(`${BACKEND_URL}/snap-solve/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio_base64: base64Audio,
            mime_type: mimeType,
          }),
        });

        const sttData = await sttResp.json();
        const userTranscript = (sttData.transcript || '').trim();

        if (!userTranscript) {
          setTutorState('idle');
          return;
        }

        // Add user question to messages
        setMessages((prev) => [...prev, { role: 'user', content: userTranscript }]);

        // Step 2: Solve doubt with GPT-OSS-120B and Groq TTS via rookie_backend
        await solveDoubtWithAI(userTranscript);
      } catch (err) {
        console.error('Voice processing error:', err);
        setTutorState('idle');
      }
    };
  };

  // Send textual question directly (via text input or after STT)
  const solveDoubtWithAI = async (doubtText: string) => {
    setTutorState('thinking');

    try {
      const resp = await fetch(`${BACKEND_URL}/snap-solve/voice-doubt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: questionText,
          solution: solutionText,
          user_doubt: doubtText,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          voice: 'autumn',
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to get tutor explanation');
      }

      const tutorText = data.text || 'Here is the explanation for your doubt.';
      const audioBase64 = data.audio_base64;

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: tutorText,
          audioBase64,
        },
      ]);

      // Play audio if available and not muted
      if (audioBase64 && !isMuted) {
        playAudio(audioBase64);
      } else {
        setTutorState('idle');
      }
    } catch (err: any) {
      console.error('Voice doubt error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I had trouble processing that doubt. Could you try asking once more?',
        },
      ]);
      setTutorState('idle');
    }
  };

  // Play audio response and sync state
  const playAudio = (audioBase64: string) => {
    try {
      const audioSrc = `data:audio/wav;base64,${audioBase64}`;
      const audio = new Audio(audioSrc);
      currentAudioElementRef.current = audio;

      audio.onplay = () => {
        setTutorState('speaking');
        // Animate pseudo voice bars while AI is speaking
        let counter = 0;
        const interval = setInterval(() => {
          counter++;
          if (tutorState !== 'speaking' && counter > 100) {
            clearInterval(interval);
            return;
          }
          const simulated = Array.from({ length: 20 }, () =>
            Math.floor(Math.random() * 32 + 6)
          );
          setAudioLevels(simulated);
        }, 120);
        (audio as any)._animInterval = interval;
      };

      audio.onended = () => {
        if ((audio as any)._animInterval) {
          clearInterval((audio as any)._animInterval);
        }
        setAudioLevels(new Array(20).fill(4));
        setTutorState('idle');
      };

      audio.onerror = () => {
        if ((audio as any)._animInterval) {
          clearInterval((audio as any)._animInterval);
        }
        setAudioLevels(new Array(20).fill(4));
        setTutorState('idle');
      };

      audio.play();
    } catch (err) {
      console.warn('Audio playback error:', err);
      setTutorState('idle');
    }
  };

  // Handle text input submission
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = textInput.trim();
    if (!text || tutorState !== 'idle') return;

    setTextInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    solveDoubtWithAI(text);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className={`w-full max-w-lg h-[92vh] sm:h-[84vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl border transition-colors ${
          isDark
            ? 'bg-[#101217] border-neutral-800 text-white'
            : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 flex items-center justify-between border-b ${
            isDark ? 'border-neutral-800/80 bg-neutral-900/40' : 'border-neutral-100 bg-neutral-50/60'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg tracking-tight">AI Voice Tutor</h2>
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <span
                  className={`w-2 h-2 rounded-full ${
                    tutorState === 'listening'
                      ? 'bg-red-500 animate-ping'
                      : tutorState === 'speaking'
                      ? 'bg-blue-500 animate-pulse'
                      : tutorState === 'thinking'
                      ? 'bg-amber-400 animate-spin'
                      : 'bg-emerald-500'
                  }`}
                />
                <span className="capitalize font-medium">
                  {tutorState === 'idle'
                    ? 'Ready • Tap or Hold to Speak'
                    : tutorState === 'listening'
                    ? 'Listening to you...'
                    : tutorState === 'transcribing'
                    ? 'Transcribing audio (Groq Whisper)...'
                    : tutorState === 'thinking'
                    ? 'Reasoning (GPT-OSS-120B)...'
                    : 'AI Tutor Speaking...'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mute button */}
            <button
              onClick={() => {
                const nextMute = !isMuted;
                setIsMuted(nextMute);
                if (nextMute && currentAudioElementRef.current) {
                  currentAudioElementRef.current.pause();
                  setTutorState('idle');
                }
              }}
              className={`p-2 rounded-full transition-colors ${
                isDark ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-100 text-neutral-600'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className={`p-2 rounded-full transition-colors ${
                isDark ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-100 text-neutral-600'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic AI Visualizer Stage (AI Orb + Voice Visualizer + Aura Waveform) */}
        <div
          className={`py-6 px-6 flex flex-col items-center justify-center relative overflow-hidden border-b ${
            isDark
              ? 'bg-gradient-to-b from-neutral-900/60 to-transparent border-neutral-800/60'
              : 'bg-gradient-to-b from-blue-50/40 to-transparent border-neutral-100'
          }`}
        >
          {/* Ambient Aura Waveform Glow */}
          <div
            className={`absolute w-56 h-56 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
              tutorState === 'listening'
                ? 'bg-rose-500/25 scale-125'
                : tutorState === 'speaking'
                ? 'bg-blue-500/30 scale-125 animate-pulse'
                : tutorState === 'thinking'
                ? 'bg-indigo-500/25 scale-110'
                : 'bg-blue-500/10 scale-95'
            }`}
          />

          {/* Interactive Glowing AI Orb */}
          <motion.div
            animate={{
              scale:
                tutorState === 'listening'
                  ? [1, 1.1, 1.05]
                  : tutorState === 'speaking'
                  ? [1, 1.12, 1]
                  : tutorState === 'thinking'
                  ? [1, 1.06, 1]
                  : [1, 1.03, 1],
              rotate: tutorState === 'thinking' ? 360 : 0,
            }}
            transition={{
              repeat: Infinity,
              duration: tutorState === 'thinking' ? 3 : 2,
              ease: 'easeInOut',
            }}
            className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center shadow-2xl cursor-pointer"
            onClick={toggleListening}
          >
            {/* Outer translucent aura rings */}
            <div
              className={`absolute inset-0 rounded-full blur-md opacity-80 transition-colors duration-500 ${
                tutorState === 'listening'
                  ? 'bg-gradient-to-r from-red-500 via-rose-500 to-amber-500'
                  : tutorState === 'speaking'
                  ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400'
                  : tutorState === 'thinking'
                  ? 'bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600'
              }`}
            />

            {/* Inner Sphere Orb */}
            <div
              className="relative w-full h-full rounded-full flex items-center justify-center overflow-hidden border border-white/30 backdrop-blur-sm"
              style={{
                background:
                  tutorState === 'listening'
                    ? 'radial-gradient(circle at 35% 35%, #ff4b4b 0%, #c9184a 55%, #590d22 100%)'
                    : tutorState === 'speaking'
                    ? 'radial-gradient(circle at 35% 35%, #60a5fa 0%, #2563eb 55%, #1e1b4b 100%)'
                    : tutorState === 'thinking'
                    ? 'radial-gradient(circle at 35% 35%, #c084fc 0%, #7c3aed 55%, #311042 100%)'
                    : 'radial-gradient(circle at 35% 35%, #3b82f6 0%, #1d4ed8 55%, #0f172a 100%)',
              }}
            >
              {/* Highlight flare */}
              <div className="absolute top-2 left-3 w-8 h-4 bg-white/40 rounded-full blur-xs rotate-[-30deg]" />

              {/* Center icon */}
              {tutorState === 'listening' ? (
                <Mic className="w-8 h-8 text-white animate-pulse" />
              ) : tutorState === 'speaking' ? (
                <Volume2 className="w-8 h-8 text-white animate-bounce" />
              ) : tutorState === 'thinking' ? (
                <Sparkles className="w-8 h-8 text-white animate-spin" />
              ) : (
                <Mic className="w-8 h-8 text-white/90" />
              )}
            </div>
          </motion.div>

          {/* Voice Visualizer Waveform (Frequency bars reacting in real time) */}
          <div className="flex items-center justify-center gap-1.5 h-12 mt-4 px-4">
            {audioLevels.map((lvl, idx) => (
              <span
                key={idx}
                className="w-1 rounded-full transition-all duration-75"
                style={{
                  height: `${lvl}px`,
                  backgroundColor:
                    tutorState === 'listening'
                      ? '#ef4444'
                      : tutorState === 'speaking'
                      ? '#3b82f6'
                      : isDark
                      ? '#374151'
                      : '#d1d5db',
                }}
              />
            ))}
          </div>
        </div>

        {/* Conversation Dialogue Transcript Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <span className="text-[11px] font-semibold text-neutral-400 mb-1 px-1 uppercase tracking-wider">
                {msg.role === 'user' ? 'You' : 'AI Tutor'}
              </span>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm sm:text-base leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-xs'
                    : isDark
                    ? 'bg-neutral-800/90 text-neutral-100 rounded-bl-xs border border-neutral-700/60'
                    : 'bg-neutral-100 text-neutral-800 rounded-bl-xs border border-neutral-200/80'
                }`}
              >
                {/* Render with KaTeX math and Markdown */}
                {renderContent(msg.content)}
              </div>

              {/* Replay audio button for assistant responses */}
              {msg.role === 'assistant' && msg.audioBase64 && (
                <button
                  onClick={() => playAudio(msg.audioBase64!)}
                  className="mt-1 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Replay voice
                </button>
              )}
            </div>
          ))}

          {/* Typing/Thinking indicator */}
          {tutorState === 'thinking' && (
            <div className="flex items-center gap-2 text-neutral-400 text-sm italic py-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]" />
              <span>Tutor is formulating explanation...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Interaction Area: Hold/Tap to Speak + Text Input Fallback */}
        <div
          className={`p-4 border-t ${
            isDark ? 'border-neutral-800 bg-[#0c0d11]' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          {/* Main Voice Button (supports Push-to-Talk and Tap-to-Talk) */}
          <div className="flex flex-col items-center justify-center mb-3">
            <button
              onPointerDown={() => {
                if (tutorState === 'idle' || tutorState === 'speaking') {
                  startListening();
                }
              }}
              onPointerUp={() => {
                if (tutorState === 'listening') {
                  stopListening();
                }
              }}
              onClick={() => {
                // Also toggle for simple clicks
                if (tutorState !== 'listening') {
                  toggleListening();
                }
              }}
              disabled={tutorState === 'thinking' || tutorState === 'transcribing'}
              className={`w-full py-3.5 px-6 rounded-2xl font-semibold text-base flex items-center justify-center gap-3 transition-all duration-200 shadow-lg active:scale-98 disabled:opacity-50 select-none ${
                tutorState === 'listening'
                  ? 'bg-red-600 hover:bg-red-700 text-white ring-4 ring-red-500/30 animate-pulse'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
              }`}
            >
              <Mic className="w-5 h-5" />
              <span>
                {tutorState === 'listening'
                  ? 'Release or Tap to Send'
                  : tutorState === 'transcribing'
                  ? 'Transcribing speech...'
                  : tutorState === 'thinking'
                  ? 'Reasoning answer...'
                  : 'Hold or Tap to Speak'}
              </span>
            </button>
            <span className="text-[11px] text-neutral-400 mt-1.5 font-normal">
              Groq Whisper Large v3 STT • GPT-OSS-120B • CanopyLabs Orpheus TTS
            </span>
          </div>

          {/* Optional Text input for quiet classrooms / libraries */}
          <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Or type your doubt here..."
              disabled={tutorState !== 'idle'}
              className={`flex-1 text-sm rounded-xl px-4 py-2.5 outline-none border transition-colors ${
                isDark
                  ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-500 focus:border-blue-500'
                  : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-blue-500'
              }`}
            />
            <button
              type="submit"
              disabled={!textInput.trim() || tutorState !== 'idle'}
              className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-white transition-colors"
              aria-label="Send text doubt"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default VoiceTutorModal;
