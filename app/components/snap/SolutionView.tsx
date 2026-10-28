'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  MoreVertical,
  Bookmark,
  Share2,
  Maximize2,
  X,
  Mic,
  Square,
  FileText,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { renderContent } from '../renderContent';
import 'katex/dist/katex.min.css';
import 'katex/dist/contrib/mhchem.js';
import { checkDoubtQuota, recordDoubtAsked, recordAskAIClicked } from '@/lib/doubtQuota';
import { DoubtLimitModal } from './DoubtLimitModal';
import { hasRookiePass } from '@/lib/rookiePass';
import { SimilarQuestionsSection } from './SimilarQuestionsSection';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://rookie-backend.vercel.app';

interface SolutionViewProps {
  imageSrc: string;
  solutionText: string;
  questionText?: string;
  title?: string;
  subject?: string;
  topic?: string;
  embedding?: number[];
  onBack: () => void;
  onRedo?: () => void;
  isRegenerating?: boolean;
  hasPass?: boolean | null;
  isDark?: boolean;
}

type TutorState = 'idle' | 'listening' | 'thinking' | 'speaking';

export function SolutionView({
  imageSrc,
  solutionText,
  questionText = '',
  title,
  subject,
  topic,
  embedding,
  onBack,
  onRedo,
  isRegenerating = false,
  hasPass,
  isDark = true,
}: SolutionViewProps) {
  // Top nav states
  const [showMenu, setShowMenu] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Quota & Pass state
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [userHasPass, setUserHasPass] = useState<boolean | null>(hasPass ?? null);

  useEffect(() => {
    if (hasPass !== undefined && hasPass !== null) {
      setUserHasPass(hasPass);
    } else {
      hasRookiePass().then(p => setUserHasPass(p)).catch(() => setUserHasPass(false));
    }
  }, [hasPass]);

  // Voice AI Tutor states
  const [isAuraActive, setIsAuraActive] = useState(false);
  const [tutorState, setTutorState] = useState<TutorState>('idle');
  const [showExplanationCard, setShowExplanationCard] = useState(false);
  const [explanationText, setExplanationText] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([]);

  // Audio recording & playback refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.src = '';
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Handle Save
  const handleSave = () => {
    setShowMenu(false);
    try {
      const savedItems = JSON.parse(localStorage.getItem('saved_snap_solutions') || '[]');
      const newItem = {
        id: Date.now().toString(),
        title: title || 'Question Solution',
        subject: subject || 'Science',
        topic: topic || 'Doubt',
        solution: solutionText,
        imageSrc,
        date: new Date().toISOString(),
      };
      localStorage.setItem('saved_snap_solutions', JSON.stringify([newItem, ...savedItems]));
      setIsSaved(true);
      toast.success('Solution saved to library');
    } catch {
      toast.success('Saved');
    }
  };

  // Handle Share
  const handleShare = async () => {
    setShowMenu(false);
    const shareText = `Check out this solution on Rookie:\n\n${title || 'Doubt Solution'}\n\n${solutionText.slice(0, 300)}...`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Rookie Doubt Solution',
          text: shareText,
          url: window.location.href,
        });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success('Solution copied to clipboard');
      } catch {
        toast.error('Could not copy link');
      }
    }
  };

  // Unlock audio context for mobile browsers on user interaction
  const unlockAudio = () => {
    try {
      if (typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          ctx.resume();
        }
      }
    } catch {}
  };

  // Browser speech synthesis fallback
  const speakWithBrowserTTS = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setTutorState('idle');
      return;
    }

    try {
      window.speechSynthesis.cancel();

      // Clean LaTeX & markdown for pleasant speech
      const spokenText = text
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2')
        .replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1')
        .replace(/\$\$[\s\S]*?\$\$/g, ' equation ')
        .replace(/\$[^\$]*?\$/g, (m) => m.replace(/\$/g, ''))
        .replace(/[\*_#`~]/g, '')
        .replace(/\\text\{([^}]+)\}/g, '$1')
        .replace(/\\[a-zA-Z]+/g, ' ')
        .trim();

      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      // Select an English natural voice if present
      const voices = window.speechSynthesis.getVoices();
      const englishVoice =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Samantha') ||
              v.name.includes('Aaron'))
        ) || voices.find((v) => v.lang.startsWith('en'));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      utterance.onstart = () => {
        setTutorState('speaking');
      };
      utterance.onend = () => {
        setTutorState('idle');
      };
      utterance.onerror = () => {
        setTutorState('idle');
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setTutorState('idle');
    }
  };

  // Play audio response with fallback
  const playAudio = async (
    audioBase64: string,
    mimeType: string = 'audio/wav',
    fallbackText: string = ''
  ) => {
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.src = '';
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
      currentAudioRef.current = audio;

      audio.onplay = () => {
        setTutorState('speaking');
      };

      audio.onended = () => {
        setTutorState('idle');
      };

      audio.onerror = (e) => {
        console.warn('Audio playback error, falling back to Web Speech:', e);
        if (fallbackText) {
          speakWithBrowserTTS(fallbackText);
        } else {
          setTutorState('idle');
        }
      };

      await audio.play();
      setTutorState('speaking');
    } catch (err) {
      console.warn('Audio play failed, falling back to Web Speech:', err);
      if (fallbackText) {
        speakWithBrowserTTS(fallbackText);
      } else {
        setTutorState('idle');
      }
    }
  };

  // Start microphone recording (Hold to talk)
  const startRecording = async () => {
    const quota = checkDoubtQuota(userHasPass);
    if (!quota.allowed) {
      setShowLimitModal(true);
      return;
    }

    unlockAudio();
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = '';
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

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
        stream.getTracks().forEach((t) => t.stop());
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
      toast.error('Microphone permission required');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setTutorState('thinking');
    }
  };

  // Process voice input -> Transcribe via rookie_backend -> Doubt reasoning -> Voice playback
  const processVoiceInput = async (audioBlob: Blob, mimeType: string) => {
    setTutorState('thinking');

    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;

      try {
        // 1. Transcribe speech using rookie_backend
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

        const updatedHistory = [
          ...conversationHistory,
          { role: 'user' as const, content: userTranscript },
        ];
        setConversationHistory(updatedHistory);

        // 2. Reason doubt & generate speech via rookie_backend
        const doubtResp = await fetch(`${BACKEND_URL}/snap-solve/voice-doubt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_text: questionText,
            solution: solutionText,
            user_doubt: userTranscript,
            history: updatedHistory,
            voice: 'autumn',
          }),
        });

        const doubtData = await doubtResp.json();
        if (!doubtResp.ok) {
          throw new Error(doubtData.detail || doubtData.error || 'Failed to explain');
        }

        const tutorReply = doubtData.text || '';
        setExplanationText(tutorReply);
        setConversationHistory([
          ...updatedHistory,
          { role: 'assistant' as const, content: tutorReply },
        ]);

        // Auto-show explanation card so student can see equations
        setShowExplanationCard(true);

        // Record doubt count & analytics
        await recordDoubtAsked('home_snap', undefined, subject);

        // 3. Play generated speech (with Web Speech API fallback)
        if (doubtData.audio_base64) {
          await playAudio(
            doubtData.audio_base64,
            doubtData.audio_mime || 'audio/wav',
            tutorReply
          );
        } else {
          speakWithBrowserTTS(tutorReply);
        }
      } catch (err: any) {
        console.error('Voice processing error:', err);
        setTutorState('idle');
        toast.error('Could not process speech. Please try again.');
      }
    };
  };

  // Stop playback / recording
  const handleStop = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = '';
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setTutorState('idle');
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto ${
        isDark ? 'bg-[#0b0c10] text-neutral-100' : 'bg-[#f8f9fa] text-neutral-900'
      } transition-colors duration-300 pb-36`}
    >
      {/* Top Header */}
      <header
        className={`sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex items-center justify-between backdrop-blur-md border-b ${
          isDark
            ? 'bg-[#0b0c10]/90 border-neutral-800/80'
            : 'bg-white/90 border-neutral-200/80 shadow-xs'
        }`}
      >
        {/* Back Button */}
        <button
          onClick={onBack}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            isDark
              ? 'bg-neutral-800/80 hover:bg-neutral-700 text-white'
              : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
          }`}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Title */}
        <h1 className="text-lg sm:text-xl font-bold tracking-tight">Solution</h1>

        {/* Right Header Actions: Redo Button + 3-dots Menu */}
        <div className="flex items-center gap-2">
          {onRedo && (
            <button
              onClick={onRedo}
              disabled={isRegenerating}
              className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-semibold border transition-all ${
                isDark
                  ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-300'
              } ${isRegenerating ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
              title="Regenerate solution"
              aria-label="Regenerate solution"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin text-blue-400' : ''}`} />
              <span>{isRegenerating ? 'Redoing...' : 'Redo'}</span>
            </button>
          )}

          {/* 3-dots Menu Button */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                isDark
                  ? 'hover:bg-neutral-800 text-neutral-300'
                  : 'hover:bg-neutral-100 text-neutral-700'
              }`}
              aria-label="More"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
                <div
                  className={`absolute right-0 mt-2 w-48 rounded-2xl shadow-2xl py-2 z-30 border transition-all ${
                    isDark
                      ? 'bg-[#14161d] border-neutral-700 text-white'
                      : 'bg-white border-neutral-200 text-neutral-900'
                  }`}
                >
                  {onRedo && (
                    <>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onRedo();
                        }}
                        disabled={isRegenerating}
                        className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm font-medium transition-colors ${
                          isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-50'
                        }`}
                      >
                        <RotateCcw className="w-4 h-4 text-blue-500" />
                        <span>Regenerate</span>
                      </button>
                      <div
                        className={`my-1 border-t ${
                          isDark ? 'border-neutral-800' : 'border-neutral-100'
                        }`}
                      />
                    </>
                  )}
                  <button
                    onClick={handleSave}
                    className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm font-medium transition-colors ${
                      isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-50'
                    }`}
                  >
                    <Bookmark
                      className={`w-4 h-4 ${isSaved ? 'fill-blue-500 text-blue-500' : ''}`}
                    />
                    <span>{isSaved ? 'Saved' : 'Save'}</span>
                  </button>
                  <div
                    className={`my-1 border-t ${
                      isDark ? 'border-neutral-800' : 'border-neutral-100'
                    }`}
                  />
                  <button
                    onClick={handleShare}
                    className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm font-medium transition-colors ${
                      isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-50'
                    }`}
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* Cropped Question Photo Preview Card */}
        <div
          className={`relative rounded-3xl overflow-hidden border shadow-sm group ${
            isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
          }`}
        >
          <img
            src={imageSrc}
            alt="Question"
            className="w-full max-h-60 sm:max-h-72 object-contain bg-black/5 dark:bg-black/20 block cursor-pointer"
            onClick={() => setShowImageModal(true)}
          />

          {/* Expand icon in bottom right */}
          <button
            onClick={() => setShowImageModal(true)}
            className="absolute bottom-3 right-3 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all active:scale-95 shadow-md"
            aria-label="Expand image"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Clean Solution Container (NO notebook page lines) */}
        <div
          className={`rounded-3xl p-6 sm:p-8 shadow-sm border transition-all ${
            isDark
              ? 'bg-[#12141a] border-neutral-800/80 text-neutral-100'
              : 'bg-white border-neutral-200/80 text-neutral-900'
          }`}
        >
          <div className="flex items-center justify-between border-b pb-4 mb-6 border-neutral-200/60 dark:border-neutral-800/80">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Solution</h2>
            {subject && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                {subject}
              </span>
            )}
          </div>

          {/* Rendered Math & Steps */}
          <div className="leading-relaxed text-base space-y-4 font-normal">
            {renderContent(solutionText)}
          </div>
        </div>

        {/* Similar PYQ Questions to Practice */}
        <SimilarQuestionsSection
          embedding={embedding}
          questionText={questionText}
          subject={subject}
          topic={topic}
          isDark={isDark}
        />
      </main>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FLOATING EXPLANATION CARD (Screenshot 1: media_1793201160728) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showExplanationCard && explanationText && (
        <div className="fixed inset-x-0 bottom-24 z-40 max-w-lg mx-auto px-4">
          <div
            className="rounded-3xl p-6 shadow-2xl border transition-all max-h-[60vh] overflow-y-auto"
            style={{
              backgroundColor: isDark ? '#14161d' : '#1c1e24',
              borderColor: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Explanation
              </h3>
              <button
                onClick={() => setShowExplanationCard(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                aria-label="Close explanation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* LaTeX Rendered Speech Text */}
            <div className="text-neutral-200 text-sm sm:text-base leading-relaxed space-y-3">
              {renderContent(explanationText)}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* BOTTOM AI TUTOR INTERFACE (Screenshots 2, 3, 4, 5)            */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none pb-6 pt-10 flex flex-col items-center justify-end">
        {/* State text above button */}
        {isAuraActive && tutorState !== 'idle' && (
          <div className="relative z-10 mb-2 pointer-events-auto">
            <span className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400 capitalize tracking-wide">
              {tutorState === 'listening'
                ? 'Listening...'
                : tutorState === 'thinking'
                ? 'Thinking...'
                : 'Speaking...'}
            </span>
          </div>
        )}

        {/* Bottom Button Row */}
        <div className="relative z-10 flex items-center justify-center gap-3 pointer-events-auto px-4">
          {!isAuraActive ? (
            /* Initial State: Ask AI Button with Static Audio Waves Icon & Aura underneath */
            <div className="relative">
              {/* Subtle Aura directly underneath button */}
              <div className="absolute -inset-1.5 bg-blue-500/40 rounded-full blur-lg opacity-80 animate-pulse pointer-events-none" />

              <button
                onClick={() => {
                  recordAskAIClicked('home_snap', undefined, subject);
                  const quota = checkDoubtQuota(userHasPass);
                  if (!quota.allowed) {
                    setShowLimitModal(true);
                    return;
                  }
                  unlockAudio();
                  setIsAuraActive(true);
                }}
                className="relative px-7 py-3.5 rounded-full bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold text-base flex items-center gap-2.5 shadow-xl hover:scale-102 active:scale-98 transition-all duration-200 border border-neutral-200 dark:border-neutral-700"
              >
                {/* Static Soundwave Bars Icon (No animation) */}
                <svg
                  className="w-5 h-5 text-blue-500 fill-current"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect x="2" y="8" width="2.5" height="8" rx="1.25" />
                  <rect x="6.5" y="4" width="2.5" height="16" rx="1.25" />
                  <rect x="11" y="2" width="2.5" height="20" rx="1.25" />
                  <rect x="15.5" y="5" width="2.5" height="14" rx="1.25" />
                  <rect x="20" y="8" width="2.5" height="8" rx="1.25" />
                </svg>
                <span>Ask AI</span>
              </button>
            </div>
          ) : (
            /* Active State: [ Document/Chevron button ] + [ Center Voice Button with Aura ] */
            <>
              {/* Left Circular Button (Toggle explanation sheet or collapse) */}
              <button
                onClick={() => setShowExplanationCard(!showExplanationCard)}
                className="w-12 h-12 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-lg flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:scale-105 active:scale-95 transition-all"
                title={showExplanationCard ? 'Collapse explanation' : 'Show explanation'}
                aria-label="Toggle explanation text"
              >
                {showExplanationCard ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
              </button>

              {/* Center Main Voice Button with Aura directly underneath */}
              <div className="relative">
                {/* Subtle Aura directly underneath button */}
                <div className="absolute -inset-1.5 bg-blue-500/40 rounded-full blur-lg opacity-80 animate-pulse pointer-events-none" />

                {tutorState === 'speaking' || tutorState === 'thinking' ? (
                  /* Stop button (Screenshot 1, 4, 5) */
                  <button
                    onClick={handleStop}
                    className="relative px-7 py-3.5 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white font-semibold text-base flex items-center gap-2.5 shadow-xl hover:scale-102 active:scale-98 transition-all"
                  >
                    <span className="w-3.5 h-3.5 rounded-xs bg-red-500" />
                    <span>Stop</span>
                  </button>
                ) : (
                  /* Hold to talk button (Screenshot 3) */
                  <button
                    onPointerDown={startRecording}
                    onPointerUp={stopRecording}
                    onClick={() => {
                      // Tap fallback
                      if (tutorState === 'listening') {
                        stopRecording();
                      } else if (tutorState === 'idle') {
                        startRecording();
                      }
                    }}
                    className={`relative px-7 py-3.5 rounded-full font-semibold text-base flex items-center gap-2.5 shadow-xl active:scale-98 transition-all select-none ${
                      tutorState === 'listening'
                        ? 'bg-red-500 text-white shadow-red-500/30'
                        : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white'
                    }`}
                  >
                    <Mic
                      className={`w-5 h-5 ${
                        tutorState === 'listening' ? 'text-white' : 'text-neutral-800 dark:text-white'
                      }`}
                    />
                    <span>
                      {tutorState === 'listening' ? 'Release to send' : 'Hold to talk'}
                    </span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* High-Resolution Image Lightbox Modal */}
      {showImageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={imageSrc}
            alt="Original question"
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Quota Limit Upgrade Modal */}
      <DoubtLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onPassGranted={() => setUserHasPass(true)}
        isDark={isDark}
      />
    </div>
  );
}

export default SolutionView;
