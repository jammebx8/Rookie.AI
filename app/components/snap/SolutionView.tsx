'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  MoreVertical,
  Bookmark,
  Share2,
  Maximize2,
  X,
  Sparkles,
  Volume2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { renderContent } from '../renderContent';
import 'katex/dist/katex.min.css';

interface SolutionViewProps {
  imageSrc: string;
  solutionText: string;
  title?: string;
  subject?: string;
  topic?: string;
  onBack: () => void;
  onAskAI: () => void;
  isDark?: boolean;
}

export function SolutionView({
  imageSrc,
  solutionText,
  title,
  subject,
  topic,
  onBack,
  onAskAI,
  isDark = true,
}: SolutionViewProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

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
      toast.success('Solution saved to library!');
    } catch (err) {
      toast.success('Saved locally!');
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
      } catch (err) {
        // User cancelled or not supported
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success('Solution copied to clipboard!');
      } catch {
        toast.error('Could not copy link');
      }
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto ${
        isDark ? 'bg-[#0f1115] text-neutral-100' : 'bg-[#f6f7f9] text-neutral-900'
      } transition-colors duration-300 pb-28`}
    >
      {/* Top Header */}
      <header
        className={`sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex items-center justify-between backdrop-blur-md border-b ${
          isDark
            ? 'bg-[#0f1115]/90 border-neutral-800/80'
            : 'bg-white/90 border-neutral-200/80 shadow-sm'
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
          aria-label="Go Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Title */}
        <h1 className="text-lg sm:text-xl font-bold tracking-tight">Solution</h1>

        {/* 3-dots Menu Button */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              isDark
                ? 'hover:bg-neutral-800 text-neutral-300'
                : 'hover:bg-neutral-100 text-neutral-700'
            }`}
            aria-label="More options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Dropdown Menu (Screenshot 5 style) */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowMenu(false)}
              />
              <div
                className={`absolute right-0 mt-2 w-48 rounded-2xl shadow-2xl py-2 z-30 border transition-all ${
                  isDark
                    ? 'bg-[#181a20] border-neutral-700 text-white'
                    : 'bg-white border-neutral-200 text-neutral-900'
                }`}
              >
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
            alt="Cropped Question"
            className="w-full max-h-60 sm:max-h-72 object-contain bg-black/5 dark:bg-black/20 block cursor-pointer"
            onClick={() => setShowImageModal(true)}
          />

          {/* Expand icon in bottom right */}
          <button
            onClick={() => setShowImageModal(true)}
            className="absolute bottom-3 right-3 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all active:scale-95 shadow-md"
            title="Expand image"
            aria-label="Expand image"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Notebook-Ruled Solution Container (Screenshot 5 authentic look) */}
        <div
          className={`rounded-3xl p-6 sm:p-8 shadow-sm border transition-all ${
            isDark
              ? 'bg-[#13151b] border-neutral-800/80'
              : 'bg-[#fafbfa] border-neutral-200/80'
          }`}
          style={{
            // Subtle notebook lined background pattern
            backgroundImage: isDark
              ? 'repeating-linear-gradient(transparent, transparent 29px, rgba(255, 255, 255, 0.04) 29px, rgba(255, 255, 255, 0.04) 30px)'
              : 'repeating-linear-gradient(transparent, transparent 29px, rgba(0, 0, 0, 0.04) 29px, rgba(0, 0, 0, 0.04) 30px)',
          }}
        >
          {/* Solution Heading */}
          <div className="flex items-center justify-between border-b pb-4 mb-6 border-neutral-200/60 dark:border-neutral-800/80">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Solution
            </h2>
            {subject && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                {subject}
              </span>
            )}
          </div>

          {/* Rendered Math & Markdown Solution */}
          <div className="text-neutral-800 dark:text-neutral-200 leading-relaxed text-base space-y-4 font-normal">
            {renderContent(solutionText)}
          </div>
        </div>
      </main>

      {/* Floating Bottom Button: "Ask AI" (Screenshot 5 style) */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-40 pointer-events-none">
        <div className="relative pointer-events-auto">
          {/* Ambient Glowing Aura */}
          <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400 rounded-full blur-md opacity-70 animate-pulse" />

          {/* Pill Button */}
          <button
            onClick={onAskAI}
            className="relative px-6 sm:px-8 py-3.5 rounded-full bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold text-base sm:text-lg flex items-center gap-3 shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border border-neutral-200 dark:border-neutral-700"
          >
            {/* Audio Waveform Stripes Icon */}
            <div className="flex items-center gap-[2.5px] h-4">
              <span className="w-1 bg-blue-500 rounded-full h-2 animate-[pulse_1s_ease-in-out_infinite]" />
              <span className="w-1 bg-blue-500 rounded-full h-4 animate-[pulse_1.2s_ease-in-out_infinite]" />
              <span className="w-1 bg-blue-500 rounded-full h-3 animate-[pulse_0.9s_ease-in-out_infinite]" />
              <span className="w-1 bg-blue-500 rounded-full h-4 animate-[pulse_1.4s_ease-in-out_infinite]" />
              <span className="w-1 bg-blue-500 rounded-full h-2 animate-[pulse_1.1s_ease-in-out_infinite]" />
            </div>

            <span>Ask AI</span>
          </button>
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
            alt="Full-size question"
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default SolutionView;
