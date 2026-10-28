'use client';

import React from 'react';
import { ArrowLeft, AlertCircle, Camera } from 'lucide-react';

interface InvalidViewProps {
  imageSrc: string;
  errorMessage?: string;
  onRetake: () => void;
  onBack: () => void;
  isDark?: boolean;
}

export function InvalidView({
  imageSrc,
  errorMessage = "This doesn't look like schoolwork. Snap a question from your book or notebook.",
  onRetake,
  onBack,
  isDark = true,
}: InvalidViewProps) {
  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto flex flex-col justify-between ${
        isDark ? 'bg-[#0f1115] text-white' : 'bg-[#f8f9fa] text-neutral-900'
      } transition-colors duration-300`}
    >
      {/* Top Header */}
      <div className="px-5 pt-5 pb-3 flex items-center">
        <button
          onClick={onBack}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            isDark
              ? 'bg-neutral-800/80 hover:bg-neutral-700 text-white'
              : 'bg-white hover:bg-neutral-100 text-neutral-800 shadow-sm'
          }`}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-md w-full mx-auto px-5 py-4 flex flex-col gap-5">
        {/* Cropped Photo Preview Card */}
        <div
          className={`w-full overflow-hidden rounded-3xl shadow-sm border ${
            isDark ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'
          }`}
        >
          <img
            src={imageSrc}
            alt="Snapped non-schoolwork question"
            className="w-full max-h-56 sm:max-h-64 object-cover block"
          />
        </div>

        {/* Rejection Alert Banner (Screenshot 4 style) */}
        <div
          className="rounded-2xl p-4 flex items-center gap-3.5 shadow-sm"
          style={{
            backgroundColor: isDark ? 'rgba(127, 29, 29, 0.25)' : '#fbeeed',
            border: isDark ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid #f8d7da',
          }}
        >
          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-red-500 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <p
            className="text-xs sm:text-sm font-medium leading-relaxed"
            style={{ color: isDark ? '#fca5a5' : '#b02a37' }}
          >
            {errorMessage}
          </p>
        </div>

        {/* Action Button: Take new photo */}
        <button
          onClick={onRetake}
          className="w-full mt-2 py-4 px-6 rounded-2xl bg-[#1c1c1e] hover:bg-black text-white dark:bg-white dark:text-black dark:hover:bg-neutral-100 font-semibold text-base flex items-center justify-between shadow-xl active:scale-98 transition-all duration-200"
        >
          <span>Take new photo</span>
          <Camera className="w-5 h-5" />
        </button>
      </div>

      {/* Footer spacer */}
      <div className="h-6" />
    </div>
  );
}

export default InvalidView;
