'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Maximize, Minimize, Volume2, VolumeX, X, Command } from 'lucide-react';
import { competeAudio } from '@/lib/competeAudio';

interface CompeteHeaderProps {
  examTitle?: string;
  inBattle?: boolean;
  onExit?: () => void;
}

export function CompeteHeader({
  examTitle = 'JEE Main and Advanced Preparation',
  inBattle = false,
  onExit,
}: CompeteHeaderProps) {
  const router = useRouter();
  const [muted, setMuted] = useState(() => competeAudio.isMuted());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  const toggleSound = () => {
    const next = competeAudio.toggleMute();
    setMuted(next);
  };

  const toggleFullscreen = () => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleExitClick = () => {
    if (inBattle) {
      setShowExitConfirm(true);
    } else {
      if (onExit) onExit();
      else router.push('/home');
    }
  };

  const confirmExit = () => {
    setShowExitConfirm(false);
    if (onExit) onExit();
    else router.push('/home');
  };

  return (
    <>
      <header className="relative z-40 flex h-16 w-full items-center justify-between px-4 sm:px-8 text-white select-none">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/rookie-owl.png" alt="Rookie" className="size-8 rounded-lg shadow-sm" />
          <div className="flex items-center gap-1.5 font-bold tracking-tight text-white text-base sm:text-lg">
            <span>Rookie</span>
            <span className="rounded-md bg-blue-500/20 px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-widest text-sky-400 border border-sky-400/30">
              Compete
            </span>
          </div>
        </div>

        {/* Center: Exam syllabus */}
        <div className="hidden md:flex items-center justify-center">
          <span className="text-xs font-medium text-slate-300 tracking-wide bg-white/5 border border-white/10 px-3.5 py-1 rounded-full backdrop-blur-sm">
            {examTitle}
          </span>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Exit Button */}
          <button
            onClick={handleExitClick}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-white/20 active:scale-95 border border-white/10"
            title="Exit Compete"
          >
            <X className="size-3.5" />
            <span>Exit</span>
          </button>

          {/* Keyboard Shortcuts */}
          <button
            onClick={() => setShowKeyboardHelp(true)}
            className="hidden sm:flex size-8 items-center justify-center rounded-lg bg-white/10 text-white/80 transition hover:bg-white/20 active:scale-95 border border-white/10"
            title="Keyboard Shortcuts"
          >
            <Command className="size-3.5" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-white/80 transition hover:bg-white/20 active:scale-95 border border-white/10"
            title={muted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {muted ? <VolumeX className="size-4 text-red-400" /> : <Volume2 className="size-4 text-sky-400" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="hidden sm:flex size-8 items-center justify-center rounded-lg bg-white/10 text-white/80 transition hover:bg-white/20 active:scale-95 border border-white/10"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
          </button>
        </div>
      </header>

      {/* Confirmation Modal when exiting during battle */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0e162e] border border-white/15 p-6 text-white shadow-2xl">
            <h3 className="text-lg font-bold text-white">Forfeit Match?</h3>
            <p className="mt-2 text-sm text-slate-300">
              Leaving the 1v1 battle early counts as a forfeit and may affect your rating. Are you sure?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 transition"
              >
                Stay in Match
              </button>
              <button
                onClick={confirmExit}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition shadow-lg shadow-red-600/30"
              >
                Leave Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0e162e] border border-white/15 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Command className="size-4 text-sky-400" /> Keyboard Shortcuts
              </h3>
              <button onClick={() => setShowKeyboardHelp(false)} className="text-white/60 hover:text-white">
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span>Select Option A</span>
                <kbd className="rounded bg-white/10 px-2 py-0.5 font-mono text-xs text-sky-300">1</kbd>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span>Select Option B</span>
                <kbd className="rounded bg-white/10 px-2 py-0.5 font-mono text-xs text-sky-300">2</kbd>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span>Select Option C</span>
                <kbd className="rounded bg-white/10 px-2 py-0.5 font-mono text-xs text-sky-300">3</kbd>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span>Select Option D</span>
                <kbd className="rounded bg-white/10 px-2 py-0.5 font-mono text-xs text-sky-300">4</kbd>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span>Toggle Sound</span>
                <kbd className="rounded bg-white/10 px-2 py-0.5 font-mono text-xs text-sky-300">M</kbd>
              </div>
            </div>
            <button
              onClick={() => setShowKeyboardHelp(false)}
              className="mt-6 w-full rounded-lg bg-sky-600 py-2 text-sm font-semibold text-white hover:bg-sky-500 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
