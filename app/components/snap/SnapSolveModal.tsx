'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CameraView } from './CameraView';
import { CropView } from './CropView';
import { InvalidView } from './InvalidView';
import { SolutionView } from './SolutionView';
import { VoiceTutorModal } from './VoiceTutorModal';
import { Loader2, Sparkles } from 'lucide-react';

interface SnapSolveModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
}

type Step = 'camera' | 'crop' | 'analyzing' | 'invalid' | 'solution';

interface SolutionData {
  is_schoolwork: boolean;
  question_text?: string;
  subject?: string;
  topic?: string;
  title?: string;
  solution?: string;
  error?: string;
}

export function SnapSolveModal({ isOpen, onClose, isDark = true }: SnapSolveModalProps) {
  const [step, setStep] = useState<Step>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<SolutionData | null>(null);
  const [analysisStatusText, setAnalysisStatusText] = useState<string>('Scanning image with Qwen 27B Vision...');
  const [showVoiceTutor, setShowVoiceTutor] = useState<boolean>(false);

  if (!isOpen) return null;

  // Step 1: Image Captured from Camera or Gallery
  const handleCapture = (imageDataUrl: string) => {
    setCapturedImage(imageDataUrl);
    setStep('crop');
  };

  // Step 2: Image Cropped & Confirmed
  const handleCropConfirm = async (croppedBase64: string) => {
    setCroppedImage(croppedBase64);
    setStep('analyzing');
    setAnalysisStatusText('Inspecting schoolwork with Qwen 27B Vision...');

    try {
      // Send to analyze API
      setAnalysisStatusText('Verifying question & extracting equations...');
      const response = await fetch('/api/snap-solve/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: croppedBase64 }),
      });

      const data: SolutionData = await response.json();
      setAnalysisResult(data);

      if (!response.ok || !data.is_schoolwork) {
        setStep('invalid');
      } else {
        setStep('solution');
      }
    } catch (err: any) {
      console.error('Snap analyze error:', err);
      setAnalysisResult({
        is_schoolwork: false,
        error: "This doesn't look like schoolwork. Snap a question from your book or notebook.",
      });
      setStep('invalid');
    }
  };

  // Reset to take new photo
  const handleRetake = () => {
    setCapturedImage(null);
    setCroppedImage(null);
    setAnalysisResult(null);
    setShowVoiceTutor(false);
    setStep('camera');
  };

  // Close full flow
  const handleClose = () => {
    handleRetake();
    onClose();
  };

  return (
    <div className="relative z-50">
      <AnimatePresence mode="wait">
        {step === 'camera' && (
          <CameraView onCapture={handleCapture} onClose={handleClose} />
        )}

        {step === 'crop' && capturedImage && (
          <CropView
            imageSrc={capturedImage}
            onConfirm={handleCropConfirm}
            onClose={handleClose}
          />
        )}

        {step === 'analyzing' && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none">
            {/* Thumbnail of cropped image */}
            {croppedImage && (
              <div className="w-36 h-36 rounded-2xl overflow-hidden mb-6 border-2 border-blue-500/50 shadow-2xl relative">
                <img
                  src={croppedImage}
                  alt="Analyzing question"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-blue-500/20 animate-pulse" />
              </div>
            )}

            {/* Glowing Spinner */}
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-blue-400 animate-pulse" />
              </div>
            </div>

            <h3 className="text-white text-xl font-bold mb-2 tracking-tight">
              Analyzing Question
            </h3>
            <p className="text-neutral-400 text-sm max-w-xs leading-relaxed">
              {analysisStatusText}
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-neutral-500 font-mono">
              <span>Groq Cloud</span>
              <span>•</span>
              <span>qwen/qwen3.8-27b</span>
              <span>•</span>
              <span>gpt-oss-120b</span>
            </div>
          </div>
        )}

        {step === 'invalid' && croppedImage && (
          <InvalidView
            imageSrc={croppedImage}
            errorMessage={
              analysisResult?.error ||
              "This doesn't look like schoolwork. Snap a question from your book or notebook."
            }
            onRetake={handleRetake}
            onBack={handleRetake}
            isDark={isDark}
          />
        )}

        {step === 'solution' && croppedImage && analysisResult && (
          <>
            <SolutionView
              imageSrc={croppedImage}
              solutionText={analysisResult.solution || 'No solution provided.'}
              title={analysisResult.title}
              subject={analysisResult.subject}
              topic={analysisResult.topic}
              onBack={handleRetake}
              onAskAI={() => setShowVoiceTutor(true)}
              isDark={isDark}
            />

            {/* Voice AI Tutor Modal */}
            {showVoiceTutor && (
              <VoiceTutorModal
                questionText={analysisResult.question_text || ''}
                solutionText={analysisResult.solution || ''}
                title={analysisResult.title}
                onClose={() => setShowVoiceTutor(false)}
                isDark={isDark}
              />
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SnapSolveModal;
