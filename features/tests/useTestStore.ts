'use client'
// ─── features/tests/useTestStore.ts ──────────────────────────────────────────
// useReducer-based state for the wizard + active test session.
// No Zustand needed — pure React.

import { useCallback, useReducer } from 'react'
import type {
  TestConfig,
  WizardStep,
  AnswerMap,
  AnswerEntry,
  QuestionStatus,
} from './types'
import { EMPTY_CONFIG } from './types'

// ─── Wizard State ─────────────────────────────────────────────────────────────

export interface WizardState {
  open:   boolean
  step:   WizardStep
  config: TestConfig
  /** Set to true once user has touched anything — triggers discard confirm on X */
  dirty:  boolean
}

const INITIAL_WIZARD: WizardState = {
  open:   false,
  step:   1,
  config: EMPTY_CONFIG,
  dirty:  false,
}

type WizardAction =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'RESET' }
  | { type: 'SET_STEP'; step: WizardStep }
  | { type: 'SET_EXAM'; examId: TestConfig['examId'] }
  | { type: 'SET_YEARS'; years: string[] }
  | { type: 'SET_SUBJECTS'; subjects: string[] }
  | { type: 'SET_CHAPTERS'; chapters: string[] }
  | { type: 'SET_DURATION'; seconds: number }

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'OPEN':
      return { ...state, open: true }
    case 'CLOSE':
      return { ...state, open: false }
    case 'RESET':
      return INITIAL_WIZARD
    case 'SET_STEP':
      return { ...state, step: action.step }
    case 'SET_EXAM':
      return {
        ...state, dirty: true,
        config: {
          ...EMPTY_CONFIG,
          examId: action.examId,
        },
      }
    case 'SET_YEARS':
      return {
        ...state, dirty: true,
        config: {
          ...state.config,
          years: action.years,
          chapters: [],   // reset downstream
        },
      }
    case 'SET_SUBJECTS':
      return {
        ...state, dirty: true,
        config: {
          ...state.config,
          subjects: action.subjects,
          chapters: [],   // reset downstream
        },
      }
    case 'SET_CHAPTERS':
      return {
        ...state, dirty: true,
        config: { ...state.config, chapters: action.chapters },
      }
    case 'SET_DURATION':
      return {
        ...state, dirty: true,
        config: { ...state.config, durationSeconds: action.seconds },
      }
    default:
      return state
  }
}

// ─── Test Engine State ────────────────────────────────────────────────────────

export interface EngineState {
  currentIndex: number
  answers:      AnswerMap
  /** unix ms when current question was first visited — for time tracking */
  questionEnteredAt: number
  paletteOpen:  boolean
  submitOpen:   boolean
}

type EngineAction =
  | { type: 'GOTO'; index: number }
  | { type: 'SELECT_OPTION'; questionId: string; option: string }
  | { type: 'CLEAR_SELECTION'; questionId: string }
  | { type: 'TOGGLE_MARK'; questionId: string }
  | { type: 'MARK_VISITED'; questionId: string }
  | { type: 'TICK_TIME'; questionId: string }     // called on navigation away
  | { type: 'TOGGLE_PALETTE' }
  | { type: 'OPEN_SUBMIT' }
  | { type: 'CLOSE_SUBMIT' }
  | { type: 'HYDRATE'; answers: AnswerMap }        // restore from DB on resume

function getOrInit(answers: AnswerMap, qid: string): AnswerEntry {
  return answers[qid] ?? {
    selected_option:    null,
    q_status:           'not_visited',
    time_spent_seconds: 0,
  }
}

function engineReducer(state: EngineState, action: EngineAction): EngineState {
  switch (action.type) {

    case 'GOTO': {
      // flush time for current question before navigating
      const elapsed = Math.round((Date.now() - state.questionEnteredAt) / 1000)
      const prevQid  = '' // we don't have question_ids here — caller uses TICK_TIME
      void prevQid
      return {
        ...state,
        currentIndex:      action.index,
        questionEnteredAt: Date.now(),
      }
    }

    case 'TICK_TIME': {
      const elapsed  = Math.round((Date.now() - state.questionEnteredAt) / 1000)
      const existing = getOrInit(state.answers, action.questionId)
      return {
        ...state,
        questionEnteredAt: Date.now(),
        answers: {
          ...state.answers,
          [action.questionId]: {
            ...existing,
            time_spent_seconds: existing.time_spent_seconds + elapsed,
          },
        },
      }
    }

    case 'MARK_VISITED': {
      const existing = getOrInit(state.answers, action.questionId)
      if (existing.q_status !== 'not_visited') return state
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.questionId]: { ...existing, q_status: 'visited' },
        },
      }
    }

    case 'SELECT_OPTION': {
      const existing = getOrInit(state.answers, action.questionId)
      const wasMarked = existing.q_status === 'marked' || existing.q_status === 'marked_answered'
      const newStatus: QuestionStatus = wasMarked ? 'marked_answered' : 'answered'
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.questionId]: {
            ...existing,
            selected_option: action.option,
            q_status:        newStatus,
          },
        },
      }
    }

    case 'CLEAR_SELECTION': {
      const existing = getOrInit(state.answers, action.questionId)
      const newStatus: QuestionStatus =
        existing.q_status === 'marked' || existing.q_status === 'marked_answered'
          ? 'marked'
          : 'unattempted'
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.questionId]: {
            ...existing,
            selected_option: null,
            q_status:        newStatus,
          },
        },
      }
    }

    case 'TOGGLE_MARK': {
      const existing  = getOrInit(state.answers, action.questionId)
      const hasAnswer = !!existing.selected_option
      let newStatus: QuestionStatus

      switch (existing.q_status) {
        case 'marked':
          newStatus = 'unattempted'
          break
        case 'marked_answered':
          newStatus = 'answered'
          break
        default:
          newStatus = hasAnswer ? 'marked_answered' : 'marked'
      }

      return {
        ...state,
        answers: {
          ...state.answers,
          [action.questionId]: { ...existing, q_status: newStatus },
        },
      }
    }

    case 'TOGGLE_PALETTE':
      return { ...state, paletteOpen: !state.paletteOpen }

    case 'OPEN_SUBMIT':
      return { ...state, submitOpen: true }

    case 'CLOSE_SUBMIT':
      return { ...state, submitOpen: false }

    case 'HYDRATE':
      return { ...state, answers: action.answers }

    default:
      return state
  }
}

const INITIAL_ENGINE: EngineState = {
  currentIndex:      0,
  answers:           {},
  questionEnteredAt: Date.now(),
  paletteOpen:       false,
  submitOpen:        false,
}

// ─── Public hooks ─────────────────────────────────────────────────────────────

export function useWizardStore() {
  const [state, dispatch] = useReducer(wizardReducer, INITIAL_WIZARD)

  const open    = useCallback(() => dispatch({ type: 'OPEN' }),  [])
  const close   = useCallback(() => dispatch({ type: 'CLOSE' }), [])
  const reset   = useCallback(() => dispatch({ type: 'RESET' }), [])
  const setStep = useCallback((step: WizardStep) => dispatch({ type: 'SET_STEP', step }), [])

  const setExam     = useCallback((examId: TestConfig['examId'])  => dispatch({ type: 'SET_EXAM',     examId   }), [])
  const setYears    = useCallback((years: string[])               => dispatch({ type: 'SET_YEARS',    years    }), [])
  const setSubjects = useCallback((subjects: string[])            => dispatch({ type: 'SET_SUBJECTS', subjects }), [])
  const setChapters = useCallback((chapters: string[])            => dispatch({ type: 'SET_CHAPTERS', chapters }), [])
  const setDuration = useCallback((seconds: number)              => dispatch({ type: 'SET_DURATION', seconds  }), [])

  return { state, open, close, reset, setStep, setExam, setYears, setSubjects, setChapters, setDuration }
}

export function useEngineStore(initialAnswers?: AnswerMap) {
  const [state, dispatch] = useReducer(
    engineReducer,
    { ...INITIAL_ENGINE, answers: initialAnswers ?? {} },
  )

  const goTo        = useCallback((index: number)                            => dispatch({ type: 'GOTO',          index      }), [])
  const tickTime    = useCallback((questionId: string)                        => dispatch({ type: 'TICK_TIME',     questionId }), [])
  const markVisited = useCallback((questionId: string)                        => dispatch({ type: 'MARK_VISITED',  questionId }), [])
  const selectOpt   = useCallback((questionId: string, option: string)        => dispatch({ type: 'SELECT_OPTION', questionId, option }), [])
  const clearSel    = useCallback((questionId: string)                        => dispatch({ type: 'CLEAR_SELECTION', questionId }), [])
  const toggleMark  = useCallback((questionId: string)                        => dispatch({ type: 'TOGGLE_MARK',   questionId }), [])
  const togglePalette  = useCallback(()                                       => dispatch({ type: 'TOGGLE_PALETTE' }), [])
  const openSubmit     = useCallback(()                                       => dispatch({ type: 'OPEN_SUBMIT'   }), [])
  const closeSubmit    = useCallback(()                                       => dispatch({ type: 'CLOSE_SUBMIT'  }), [])
  const hydrate        = useCallback((answers: AnswerMap)                     => dispatch({ type: 'HYDRATE',      answers    }), [])

  return {
    state,
    goTo, tickTime, markVisited, selectOpt, clearSel,
    toggleMark, togglePalette, openSubmit, closeSubmit, hydrate,
  }
}
