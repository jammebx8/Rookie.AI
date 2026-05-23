'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface Props {
  onClose: () => void;
  onSubmit: (transcript: string) => void;
}

type VoiceState = 'idle' | 'recording' | 'processing' | 'preview';

export default function VoiceModal({ onClose, onSubmit }: Props) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [countdown, setCountdown] = useState(4);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);

  // Auto-start recording when modal opens
  useEffect(() => {
    startRecording();
    return () => cleanup();
  }, []);

  // Auto-focus textarea when editing
  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.selectionStart = editRef.current.value.length;
    }
  }, [isEditing]);

  const cleanup = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    mediaRecorderRef.current?.stop();
  };

  const measureAudioLevel = (analyser: AnalyserNode) => {
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((s, v) => s + v, 0) / data.length;
      setAudioLevel(avg / 128); // 0-1
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup analyser for visualisation
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      measureAudioLevel(analyser);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        await transcribeAudio();
      };

      recorder.start(100);
      setVoiceState('recording');
    } catch (err) {
      console.error('Mic error:', err);
      onClose();
    }
  };

  const stopRecording = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setAudioLevel(0);
    setVoiceState('processing');
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    mediaRecorderRef.current?.stop();
  };

  const transcribeAudio = async () => {
    if (chunksRef.current.length === 0) { onClose(); return; }

    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const res = await fetch('/api/friday/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Transcription failed');
      const { text } = await res.json();

      setTranscript(text || '');
      setVoiceState('preview');

      // Start 4-second countdown
      let count = 4;
      setCountdown(count);
      countdownTimerRef.current = setInterval(() => {
        count -= 1;
        setCountdown(count);
        if (count <= 0) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          handleSubmit(text || '');
        }
      }, 1000);
    } catch (err) {
      console.error('Transcribe error:', err);
      setVoiceState('idle');
    }
  };

  const handleSubmit = (text?: string) => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    const t = text ?? transcript;
    if (t.trim()) onSubmit(t.trim());
    else onClose();
  };

  const handleEdit = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setIsEditing(true);
  };

  const handleRecordAgain = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setTranscript('');
    setIsEditing(false);
    setVoiceState('idle');
    chunksRef.current = [];
    startRecording();
  };

  return (
    <motion.div
      className="voice-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="voice-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        {/* Close */}
        <button className="voice-close" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Orb */}
        <div className="voice-orb-wrap">
          <div className={`voice-orb ${voiceState === 'recording' ? 'voice-orb--active' : ''} ${voiceState === 'processing' ? 'voice-orb--processing' : ''}`}>
            {/* Gradient GIF placeholder — replace with your actual gif */}
            <img
              src="/friday-orb.gif"
              alt="Friday"
              className="voice-orb__gif"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            {/* Fallback animated gradient */}
            <div className="voice-orb__gradient" />

            {/* Audio level ring */}
            {voiceState === 'recording' && (
              <motion.div
                className="voice-orb__ring"
                animate={{ scale: 1 + audioLevel * 0.4, opacity: 0.4 + audioLevel * 0.5 }}
                transition={{ duration: 0.05 }}
              />
            )}
          </div>

          {/* Pulse rings when recording */}
          {voiceState === 'recording' && (
            <>
              <div className="voice-pulse voice-pulse--1" style={{ animationDelay: '0s' }} />
              <div className="voice-pulse voice-pulse--2" style={{ animationDelay: '0.4s' }} />
            </>
          )}
        </div>

        {/* State label */}
        <div className="voice-state-label">
          {voiceState === 'idle' && 'Initializing...'}
          {voiceState === 'recording' && (
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              Listening...
            </motion.span>
          )}
          {voiceState === 'processing' && 'Processing...'}
          {voiceState === 'preview' && !isEditing && `Sending in ${countdown}s`}
          {voiceState === 'preview' && isEditing && 'Editing transcript'}
        </div>

        {/* Waveform bars when recording */}
        {voiceState === 'recording' && (
          <div className="voice-waveform">
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.div
                key={i}
                className="voice-waveform__bar"
                animate={{
                  scaleY: [
                    0.15 + Math.random() * 0.3,
                    0.3 + audioLevel * 0.7 * (0.5 + Math.random() * 0.5),
                    0.15 + Math.random() * 0.3,
                  ],
                }}
                transition={{ duration: 0.4 + Math.random() * 0.4, repeat: Infinity, delay: i * 0.04 }}
              />
            ))}
          </div>
        )}

        {/* Processing spinner */}
        {voiceState === 'processing' && (
          <div className="voice-spinner">
            <motion.div
              className="voice-spinner__ring"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}

        {/* Transcript preview */}
        {voiceState === 'preview' && (
          <motion.div
            className="voice-transcript"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {isEditing ? (
              <textarea
                ref={editRef}
                className="voice-transcript__edit"
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
                }}
                rows={3}
              />
            ) : (
              <p className="voice-transcript__text" onClick={handleEdit} title="Click to edit">
                {transcript || <span style={{ color: '#555', fontStyle: 'italic' }}>Nothing heard. Try again.</span>}
              </p>
            )}
          </motion.div>
        )}

        {/* Action buttons */}
        <div className="voice-actions">
          {voiceState === 'recording' && (
            <button className="voice-btn voice-btn--stop" onClick={stopRecording}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
              Stop
            </button>
          )}

          {voiceState === 'preview' && (
            <>
              <button className="voice-btn voice-btn--outline" onClick={handleRecordAgain}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Record again
              </button>

              {!isEditing && (
                <button className="voice-btn voice-btn--outline" onClick={handleEdit}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  Edit
                </button>
              )}

              <button className="voice-btn voice-btn--send" onClick={() => handleSubmit()}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                Send now
              </button>
            </>
          )}
        </div>
      </motion.div>

      <style>{`
        .voice-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.92);
          backdrop-filter: blur(12px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .voice-modal {
          position: relative;
          width: 340px;
          background: #0a0a0a;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 36px 28px 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          box-shadow: 0 40px 80px rgba(0,0,0,0.8);
        }

        .voice-close {
          position: absolute;
          top: 14px; right: 14px;
          background: rgba(255,255,255,0.06);
          border: none;
          color: #666;
          width: 28px; height: 28px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .voice-close:hover { color: #fff; background: rgba(255,255,255,0.1); }

        /* Orb */
        .voice-orb-wrap {
          position: relative;
          width: 140px; height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .voice-orb {
          position: relative;
          width: 120px; height: 120px;
          border-radius: 50%;
          overflow: hidden;
          border: 1.5px solid rgba(232,201,126,0.2);
          transition: border-color 0.3s;
          z-index: 2;
        }
        .voice-orb--active { border-color: rgba(232,201,126,0.5); }
        .voice-orb--processing { border-color: rgba(138,180,248,0.4); }

        .voice-orb__gif {
          position: absolute;
          inset: 0;
          width: 100%; height: 100%;
          object-fit: cover;
          z-index: 2;
        }
        .voice-orb__gradient {
          position: absolute;
          inset: 0;
          background: conic-gradient(
            from 0deg,
            #e8c97e22,
            #8ab4f820,
            #c084fc22,
            #e8c97e22
          );
          animation: rotate-gradient 4s linear infinite;
          z-index: 1;
        }
        @keyframes rotate-gradient { to { transform: rotate(360deg); } }

        .voice-orb__gradient::after {
          content: '';
          position: absolute;
          inset: 20%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(232,201,126,0.3) 0%, transparent 70%);
          animation: breathe 2s ease-in-out infinite;
        }
        @keyframes breathe {
          0%, 100% { transform: scale(0.9); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 1; }
        }

        .voice-orb__ring {
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 2px solid rgba(232,201,126,0.4);
          z-index: 3;
        }

        /* Pulse rings */
        .voice-pulse {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1.5px solid rgba(232,201,126,0.2);
          animation: voice-pulse-ring 2s ease-out infinite;
          z-index: 1;
        }
        .voice-pulse--2 { animation-delay: 0.4s; }
        @keyframes voice-pulse-ring {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.7); opacity: 0; }
        }

        /* State label */
        .voice-state-label {
          font-size: 13px;
          color: #888;
          letter-spacing: 0.02em;
          min-height: 20px;
        }

        /* Waveform */
        .voice-waveform {
          display: flex;
          align-items: center;
          gap: 3px;
          height: 32px;
        }
        .voice-waveform__bar {
          width: 3px;
          height: 100%;
          background: var(--friday-accent, #e8c97e);
          border-radius: 2px;
          transform-origin: center;
        }

        /* Spinner */
        .voice-spinner {
          position: relative;
          width: 32px; height: 32px;
        }
        .voice-spinner__ring {
          width: 100%; height: 100%;
          border-radius: 50%;
          border: 2px solid rgba(138,180,248,0.15);
          border-top-color: #8ab4f8;
        }

        /* Transcript */
        .voice-transcript {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 14px 16px;
          min-height: 60px;
        }
        .voice-transcript__text {
          font-size: 14px;
          color: #d4cfc7;
          line-height: 1.6;
          cursor: text;
        }
        .voice-transcript__edit {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          resize: none;
          font-size: 14px;
          color: #d4cfc7;
          line-height: 1.6;
          font-family: inherit;
          min-height: 60px;
        }

        /* Buttons */
        .voice-actions {
          display: flex;
          gap: 8px;
          width: 100%;
          flex-wrap: wrap;
          justify-content: center;
        }
        .voice-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 9px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .voice-btn--stop {
          background: rgba(239,68,68,0.12);
          color: #f87171;
          border: 1px solid rgba(239,68,68,0.2);
        }
        .voice-btn--stop:hover { background: rgba(239,68,68,0.2); }
        .voice-btn--outline {
          background: rgba(255,255,255,0.05);
          color: #aaa;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .voice-btn--outline:hover { background: rgba(255,255,255,0.09); color: #fff; }
        .voice-btn--send {
          background: #e8c97e;
          color: #1a1400;
          border: none;
          flex: 1;
        }
        .voice-btn--send:hover { background: #f0d484; }
      `}</style>
    </motion.div>
  );
}