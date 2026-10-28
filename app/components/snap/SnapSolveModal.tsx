'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CameraView } from './CameraView';
import { CropView } from './CropView';
import { InvalidView } from './InvalidView';
import { SolutionView } from './SolutionView';
import { Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://rookie-backend.vercel.app';

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
  const [analysisStatusText, setAnalysisStatusText] = useState<string>('Scanning image...');

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
    setAnalysisStatusText('Checking schoolwork...');

    try {
      // Send to rookie_backend analyze API
      setAnalysisStatusText('Solving question step-by-step...');
      const response = await fetch(`${BACKEND_URL}/snap-solve/analyze`, {
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

  const [isRegenerating, setIsRegenerating] = useState(false);

  // Redo / Regenerate Solution without re-cropping
  const handleRegenerate = async () => {
    if (!croppedImage || isRegenerating) return;
    setIsRegenerating(true);
    toast.loading('Regenerating solution...', { id: 'regen-toast' });
    try {
      const response = await fetch(`${BACKEND_URL}/snap-solve/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: croppedImage }),
      });
      const data: SolutionData = await response.json();
      if (response.ok && data.is_schoolwork) {
        setAnalysisResult(data);
        toast.success('Solution regenerated!', { id: 'regen-toast' });
      } else {
        toast.error('Could not regenerate solution. Please try again.', { id: 'regen-toast' });
      }
    } catch (err) {
      console.error('Regenerate error:', err);
      toast.error('Failed to regenerate solution.', { id: 'regen-toast' });
    } finally {
      setIsRegenerating(false);
    }
  };

  // Reset to take new photo
  const handleRetake = () => {
    setCapturedImage(null);
    setCroppedImage(null);
    setAnalysisResult(null);
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
          <SolutionView
            imageSrc={croppedImage}
            solutionText={analysisResult.solution || 'No solution provided.'}
            questionText={analysisResult.question_text || ''}
            title={analysisResult.title}
            subject={analysisResult.subject}
            topic={analysisResult.topic}
            onBack={handleRetake}
            onRedo={handleRegenerate}
            isRegenerating={isRegenerating}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default SnapSolveModal;
