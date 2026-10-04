'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Check, Lock } from 'lucide-react'
import { EXAM_OPTIONS } from '../types'
import type { TestConfig } from '../types'

interface Props {
  isDark: boolean
  value: TestConfig['examId']
  onChange: (id: TestConfig['examId']) => void
}

const EXAM_LOGOS: Record<string, string> = {
  'JEE Main': '/JM.png',
  'JEE Advanced': '/JA.png',
  'NEET': '/NT.png',
  'MHT CET': '/MH.png',
  'BITSAT': '/BS.png',
}

export function Step1Exam({ isDark, value, onChange }: Props) {
  const T = {
    label: isDark ? 'text-white' : 'text-[#111827]',
    muted: isDark ? 'text-[#8b95a7]' : 'text-[#6b7280]',

    card: (active: boolean, available: boolean) => {
      if (!available) {
        return isDark
          ? 'bg-[#0b0f16] border-[#1b2230] opacity-55 cursor-not-allowed'
          : 'bg-[#fafafa] border-[#e5e7eb] opacity-55 cursor-not-allowed'
      }

      if (active) {
        return isDark
          ? 'bg-[#111722] border-white/20 ring-1 ring-white/10'
          : 'bg-white border-[#d1d5db] ring-1 ring-black/5 shadow-sm'
      }

      return isDark
        ? 'bg-[#0d1117] border-[#1b2230] hover:border-[#303949] hover:bg-[#10151d] cursor-pointer'
        : 'bg-white border-[#e5e7eb] hover:border-[#d1d5db] hover:shadow-sm cursor-pointer'
    },
  }

  return (
    <div className="px-5 py-5">
      {/* Header */}
      <div className="mb-5">
        <p className={`text-sm font-semibold tracking-[-0.01em] ${T.label}`}>
          Select exam
        </p>

        <p className={`text-xs mt-1 ${T.muted}`}>
          Choose the exam you&apos;re preparing for.
        </p>
      </div>

      {/* Exam list */}
      <div className="space-y-2.5">
        {EXAM_OPTIONS.map((exam) => {
          const active = value === exam.id
          const logo = EXAM_LOGOS[exam.label]

          return (
            <motion.div
              key={exam.id}
              whileTap={exam.available ? { scale: 0.985 } : {}}
              onClick={() => exam.available && onChange(exam.id)}
              role="radio"
              aria-checked={active}
              aria-disabled={!exam.available}
              tabIndex={exam.available ? 0 : -1}
              onKeyDown={(e) => {
                if (
                  exam.available &&
                  (e.key === 'Enter' || e.key === ' ')
                ) {
                  e.preventDefault()
                  onChange(exam.id)
                }
              }}
              className={`
                group flex items-center justify-between
                px-4 py-3.5
                rounded-2xl
                border
                transition-all duration-200
                ${T.card(active, exam.available)}
              `}
            >
              {/* Left */}
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Logo */}
                <div
                  className={`
                    relative
                    w-11 h-11
                    rounded-xl
                    flex items-center justify-center
                    flex-shrink-0
                    overflow-hidden
                    border
                    transition-all duration-200
                    ${
                      isDark
                        ? 'bg-[#161c27] border-white/[0.06]'
                        : 'bg-[#f8fafc] border-black/[0.05]'
                    }
                    ${
                      active
                        ? isDark
                          ? 'bg-white/[0.06]'
                          : 'bg-gray-50'
                        : ''
                    }
                  `}
                >
                  {logo ? (
                    <img
                      src={logo}
                      alt=""
                      className={`
                        w-8 h-8 object-contain
                        transition-transform duration-200
                        ${
                          active
                            ? 'scale-105'
                            : 'group-hover:scale-105'
                        }
                      `}
                    />
                  ) : (
                    <span
                      className={`text-xs font-bold ${
                        isDark ? 'text-slate-400' : 'text-gray-500'
                      }`}
                    >
                      {exam.label
                        .split(' ')
                        .map((w) => w[0])
                        .join('')
                        .slice(0, 3)}
                    </span>
                  )}
                </div>

                {/* Text */}
                <div className="min-w-0">
                  <p
                    className={`
                      text-sm font-semibold
                      tracking-[-0.01em]
                      ${T.label}
                    `}
                  >
                    {exam.label}
                  </p>

                  <p
                    className={`
                      text-xs mt-0.5
                      truncate
                      ${T.muted}
                    `}
                  >
                    {exam.description}
                  </p>
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center gap-2.5 ml-3 flex-shrink-0">
                {!exam.available && (
                  <span
                    className={`
                      hidden sm:inline-flex
                      text-[10px]
                      px-2 py-1
                      rounded-md
                      font-medium
                      tracking-wide
                      ${
                        isDark
                          ? 'bg-white/[0.04] text-slate-500'
                          : 'bg-gray-100 text-gray-400'
                      }
                    `}
                  >
                    Soon
                  </span>
                )}

                {!exam.available ? (
                  <Lock
                    size={15}
                    strokeWidth={1.8}
                    className={
                      isDark
                        ? 'text-slate-600'
                        : 'text-gray-300'
                    }
                  />
                ) : active ? (
                  <div
                    className={`
                      w-5 h-5
                      rounded-full
                      flex items-center justify-center
                      ${
                        isDark
                          ? 'bg-white text-black'
                          : 'bg-gray-900 text-white'
                      }
                    `}
                  >
                    <Check size={12} strokeWidth={3} />
                  </div>
                ) : (
                  <div
                    className={`
                      w-5 h-5
                      rounded-full
                      border
                      transition-all duration-200
                      group-hover:border-gray-400
                      ${
                        isDark
                          ? 'border-[#303949] group-hover:border-[#596477]'
                          : 'border-gray-300 group-hover:border-gray-400'
                      }
                    `}
                  />
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Availability note */}
      <div
        className={`
          mt-5
          px-3.5 py-3
          rounded-xl
          border
          ${
            isDark
              ? 'bg-[#0d1117] border-[#1b2230]'
              : 'bg-[#fafafa] border-[#e5e7eb]'
          }
        `}
      >
        <div className="flex items-start gap-2.5">
          <div
            className={`
              mt-0.5
              w-1.5 h-1.5
              rounded-full
              flex-shrink-0
              ${
                isDark
                  ? 'bg-slate-500'
                  : 'bg-slate-400'
              }
            `}
          />

          <p
            className={`
              text-[11px]
              leading-relaxed
              ${T.muted}
            `}
          >
            Currently, JEE Main questions are available.
            JEE Advanced and NEET will be added soon.
          </p>
        </div>
      </div>
    </div>
  )
}