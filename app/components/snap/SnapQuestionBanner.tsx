'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Camera, Sparkles } from 'lucide-react';

interface SnapQuestionBannerProps {
  onClick: () => void;
  hasPass?: boolean | null;
  doubtsRemaining?: number;
  isDark?: boolean;
}

export function SnapQuestionBanner({
  onClick,
  hasPass,
  doubtsRemaining,
  isDark = true,
}: SnapQuestionBannerProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative overflow-hidden cursor-pointer group mt-4 mb-2 rounded-2xl sm:rounded-3xl shadow-xl transition-all duration-300"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #0d0f14 0%, #151821 50%, #0d0f14 100%)'
          : 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #111827 100%)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
      }}
    >
      {/* Subtle ambient gradient flare */}
      <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-blue-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/25 transition-all duration-500" />
      <div className="absolute left-1/4 -top-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 px-5 sm:px-7 py-4 sm:py-5 flex items-center justify-between gap-4">
        {/* Left Section: Text & Action */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-semibold text-lg sm:text-xl tracking-tight group-hover:text-blue-300 transition-colors">
                Snap a question
              </span>
              {hasPass ? (
                <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Unlimited Pass
                </span>
              ) : doubtsRemaining !== undefined ? (
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                    doubtsRemaining <= 0
                      ? 'text-amber-300 bg-amber-500/20 border-amber-500/30'
                      : 'text-blue-300 bg-blue-500/20 border-blue-500/30'
                  }`}
                >
                  {doubtsRemaining <= 0 ? 'Limit reached · Upgrade' : `${doubtsRemaining}/3 doubts left today`}
                </span>
              ) : null}
              <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
            </div>
            <span className="text-neutral-400 text-xs sm:text-sm mt-0.5 font-normal">
              Get instant step-by-step solutions & voice tutor
            </span>
          </div>
        </div>

        {/* Right Section: Scanner viewfinder icon graphic */}
        <div className="relative flex-shrink-0 w-16 h-14 sm:w-20 sm:h-16 flex items-center justify-center">
          {/* Blue corner scanner brackets */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Top-left */}
            <span className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-blue-400 rounded-tl-[4px]" />
            {/* Top-right */}
            <span className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-blue-400 rounded-tr-[4px]" />
            {/* Bottom-left */}
            <span className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-blue-400 rounded-bl-[4px]" />
            {/* Bottom-right */}
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-blue-400 rounded-br-[4px]" />
          </div>

          {/* Stacked notes illustration inside scanner */}
          <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
            {/* Back card (rotated) */}
            <div
              className="absolute w-8 h-10 sm:w-9 sm:h-11 rounded-sm shadow-md bg-amber-100 dark:bg-amber-200/90 rotate-[12deg] translate-x-1"
              style={{ border: '1px solid rgba(0,0,0,0.1)' }}
            >
              <div className="p-1 space-y-1 opacity-60">
                <div className="h-0.5 bg-neutral-600 rounded w-3/4" />
                <div className="h-0.5 bg-neutral-600 rounded w-1/2" />
              </div>
            </div>

            {/* Front card (straight) */}
            <div
              className="absolute w-8 h-10 sm:w-9 sm:h-11 rounded-sm shadow-lg bg-white rotate-[-6deg] -translate-x-1 flex flex-col justify-between p-1"
              style={{ border: '1px solid rgba(0,0,0,0.12)' }}
            >
              <div className="space-y-1 opacity-70">
                <div className="h-0.5 bg-blue-600 rounded w-4/5" />
                <div className="h-0.5 bg-neutral-500 rounded w-3/5" />
                <div className="h-0.5 bg-neutral-400 rounded w-2/3" />
              </div>
              <div className="text-[7px] text-blue-600 font-bold self-end leading-none font-mono">
                ∑x
              </div>
            </div>

            {/* Small camera/sparkle indicator */}
            <div className="absolute -bottom-1 -right-1 z-10 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shadow-md">
              <Camera className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default SnapQuestionBanner;
