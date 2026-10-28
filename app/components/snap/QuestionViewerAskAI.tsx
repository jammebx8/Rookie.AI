'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, FileText, ChevronDown, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { renderContent } from '../renderContent';
import { checkDoubtQuota, recordDoubtAsked, recordAskAIClicked } from '@/lib/doubtQuota';
import { DoubtLimitModal } from './DoubtLimitModal';
import 'katex/dist/katex.min.css';
import 'katex/dist/contrib/mhchem.js';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://rookie-backend.vercel.app';

interface QuestionViewerAskAIProps {
  questionText: string;
  solutionText?: string | null;
  optionsText?: string | null;
  subject?: string | null;
  chapter?: string | null;
  questionId?: string | null;
  hasPass?: boolean | null;
  isDark?: boolean;
}

type TutorState = 'idle' | 'listening' | 'thinking' | 'speaking';

export function QuestionViewerAskAI({
  questionText,
  solutionText = '',
  optionsText = '',
  subject,
  chapter,
  questionId,
  hasPass,
  isDark = true,
}: QuestionViewerAskAIProps) {
  const [isAuraActive, setIsAuraActive] = useState(false);
  const [tutorState, setTutorState] = useState<TutorState>('idle');
  const [showExplanationCard, setShowExplanationCard] = useState(false);
  const [explanationText, setExplanationText] = useState<string>('');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [userHasPass, setUserHasPass] = useState<boolean | null>(hasPass ?? null);
  const [conversationHistory, setConversationHistory] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setUserHasPass(hasPass ?? null);
  }, [hasPass]);

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

  const speakWithBrowserTTS = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setTutorState('idle');
      return;
    }

    try {
      window.speechSynthesis.cancel();

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

      utterance.onstart = () => setTutorState('speaking');
      utterance.onend = () => setTutorState('idle');
      utterance.onerror = () => setTutorState('idle');

      window.speechSynthesis.speak(utterance);
    } catch {
      setTutorState('idle');
    }
  };

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

      audio.onplay = () => setTutorState('speaking');
      audio.onended = () => setTutorState('idle');
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

  const handleAskAIClick = () => {
    recordAskAIClicked('question_viewer', questionId, subject);
    const quota = checkDoubtQuota(userHasPass);
    if (!quota.allowed) {
      setShowLimitModal(true);
      return;
    }
    unlockAudio();
    setIsAuraActive(true);
  };

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

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setTutorState('thinking');
    }
  };

  const processVoiceInput = async (audioBlob: Blob, mimeType: string) => {
    setTutorState('thinking');

    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;

      try {
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

        const promptContextQuestion = `${questionText}${optionsText ? `\n\nOptions:\n${optionsText}` : ''}`;

        const doubtResp = await fetch(`${BACKEND_URL}/snap-solve/voice-doubt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_text: promptContextQuestion,
            solution: solutionText || 'Reference solution is being worked out.',
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

        setShowExplanationCard(true);

        // Record doubt count & analytics
        await recordDoubtAsked('question_viewer', questionId, subject);

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
    <>
      {/* Floating Explanation Card */}
      {showExplanationCard && explanationText && (
        <div className="fixed inset-x-0 bottom-20 z-50 max-w-lg mx-auto px-4 pointer-events-auto">
          <div
            className="rounded-3xl p-5 sm:p-6 shadow-2xl border transition-all max-h-[50vh] overflow-y-auto"
            style={{
              backgroundColor: isDark ? '#14161d' : '#1c1e24',
              borderColor: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
            }}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                AI Tutor Explanation
              </h3>
              <button
                onClick={() => setShowExplanationCard(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                aria-label="Close explanation"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-neutral-200 text-xs sm:text-sm leading-relaxed space-y-2.5">
              {renderContent(explanationText)}
            </div>
          </div>
        </div>
      )}

      {/* Center Ask AI Button in Footer */}
      <div className="relative flex flex-col items-center justify-center">
        {/* State text above button */}
        {isAuraActive && tutorState !== 'idle' && (
          <div className="absolute -top-6 inset-x-0 text-center pointer-events-none">
            <span className="text-[11px] font-medium text-blue-400 capitalize tracking-wide whitespace-nowrap bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-xs">
              {tutorState === 'listening'
                ? 'Listening...'
                : tutorState === 'thinking'
                ? 'Thinking...'
                : 'Speaking...'}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {!isAuraActive ? (
            /* Inactive: Ask AI Button with Aura */
            <div className="relative">
              {/* Subtle Aura directly underneath button */}
              <div className="absolute -inset-1.5 bg-blue-500/40 rounded-full blur-md opacity-80 animate-pulse pointer-events-none" />

              <button
                onClick={handleAskAIClick}
                className="relative px-4 sm:px-6 py-2 rounded-full bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg hover:scale-102 active:scale-98 transition-all duration-200 border border-neutral-200 dark:border-neutral-700"
              >
                {/* Static Soundwave Bars Icon */}
                <svg
                  className="w-4 h-4 text-blue-500 fill-current"
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
              {/* Toggle explanation card button */}
              <button
                onClick={() => setShowExplanationCard(!showExplanationCard)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-md flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:scale-105 active:scale-95 transition-all"
                title={showExplanationCard ? 'Collapse explanation' : 'Show explanation'}
                aria-label="Toggle explanation text"
              >
                {showExplanationCard ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
              </button>

              {/* Main Voice Button with Aura directly underneath */}
              <div className="relative">
                <div className="absolute -inset-1.5 bg-blue-500/40 rounded-full blur-md opacity-80 animate-pulse pointer-events-none" />

                {tutorState === 'speaking' || tutorState === 'thinking' ? (
                  <button
                    onClick={handleStop}
                    className="relative px-4 sm:px-5 py-2 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg hover:scale-102 active:scale-98 transition-all"
                  >
                    <span className="w-2.5 h-2.5 rounded-xs bg-red-500" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    onPointerDown={startRecording}
                    onPointerUp={stopRecording}
                    onClick={() => {
                      if (tutorState === 'listening') {
                        stopRecording();
                      } else if (tutorState === 'idle') {
                        startRecording();
                      }
                    }}
                    className={`relative px-4 sm:px-5 py-2 rounded-full font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg active:scale-98 transition-all select-none ${
                      tutorState === 'listening'
                        ? 'bg-red-500 text-white shadow-red-500/30'
                        : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white'
                    }`}
                  >
                    <Mic
                      className={`w-4 h-4 ${
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

      {/* Quota Limit Upgrade Modal */}
      <DoubtLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onPassGranted={() => setUserHasPass(true)}
        isDark={isDark}
      />
    </>
  );
}

export default QuestionViewerAskAI;
