'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Image as ImageIcon, Zap, ZapOff, RefreshCw, Upload } from 'lucide-react';

interface CameraViewProps {
  onCapture: (imageDataUrl: string) => void;
  onClose: () => void;
}

export function CameraView({ onCapture, onClose }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [supportsTorch, setSupportsTorch] = useState<boolean>(false);

  // Initialize camera stream
  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      setCameraError(null);
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(newStream);
      setHasCamera(true);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      // Check torch capability
      const videoTrack = newStream.getVideoTracks()[0];
      const capabilities = (videoTrack?.getCapabilities?.() as any) || {};
      setSupportsTorch(!!capabilities.torch);
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setHasCamera(false);
      setCameraError('Camera access not available or permission denied.');
    }
  }, [stream]);

  useEffect(() => {
    startCamera(facingMode);

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  // Toggle torch / flash
  const toggleTorch = async () => {
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const nextState = !torchOn;
      await (videoTrack as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
    } catch (err) {
      console.warn('Torch not supported on this device/track:', err);
    }
  };

  // Switch front/back camera
  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture current frame from video to canvas
  const handleShutter = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally if using front-facing camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    onCapture(dataUrl);
  };

  // File upload from gallery
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        onCapture(result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none">
      {/* Top Header */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-4 pb-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="w-10" />
        <h1 className="text-white text-lg sm:text-xl font-bold tracking-tight">
          Snap &amp; Solve
        </h1>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Camera Viewport & 3x3 Grid */}
      <div className="relative flex-1 w-full overflow-hidden flex items-center justify-center bg-neutral-950">
        {hasCamera ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* 3x3 Rule of Thirds Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Vertical line 1 */}
              <div className="absolute top-0 bottom-0 left-1/3 w-[1px] bg-white/20" />
              {/* Vertical line 2 */}
              <div className="absolute top-0 bottom-0 left-2/3 w-[1px] bg-white/20" />
              {/* Horizontal line 1 */}
              <div className="absolute left-0 right-0 top-1/3 h-[1px] bg-white/20" />
              {/* Horizontal line 2 */}
              <div className="absolute left-0 right-0 top-2/3 h-[1px] bg-white/20" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Camera Unavailable</h3>
            <p className="text-neutral-400 text-sm mb-6">
              {cameraError || 'You can upload an image of your question directly from your device.'}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 rounded-full bg-white text-black font-semibold text-sm hover:bg-neutral-200 transition-colors"
            >
              Choose Photo from Device
            </button>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Bottom Controls */}
      <div className="relative z-20 pb-8 pt-6 px-8 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-around max-w-md mx-auto w-full">
        {/* Gallery / File Upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-neutral-800/80 hover:bg-neutral-700 active:scale-95 text-white flex items-center justify-center transition-all duration-200"
          title="Upload from device"
          aria-label="Upload from device"
        >
          <ImageIcon className="w-6 h-6" />
        </button>

        {/* Center Shutter Button */}
        <button
          onClick={handleShutter}
          disabled={!hasCamera}
          className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center group active:scale-90 transition-transform duration-150 disabled:opacity-50"
          aria-label="Take Photo"
        >
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-[3px] border-white/60 group-hover:border-white transition-colors" />
          {/* Inner solid white circle */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white shadow-xl group-hover:scale-98 transition-transform" />
        </button>

        {/* Right Toggle Button: Flash or Flip Camera */}
        {supportsTorch ? (
          <button
            onClick={toggleTorch}
            className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full ${
              torchOn ? 'bg-amber-400 text-black' : 'bg-neutral-800/80 text-white hover:bg-neutral-700'
            } active:scale-95 flex items-center justify-center transition-all duration-200`}
            title="Toggle Flash"
            aria-label="Toggle Flash"
          >
            {torchOn ? <Zap className="w-6 h-6 fill-black" /> : <ZapOff className="w-6 h-6" />}
          </button>
        ) : (
          <button
            onClick={flipCamera}
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-neutral-800/80 hover:bg-neutral-700 active:scale-95 text-white flex items-center justify-center transition-all duration-200"
            title="Flip Camera"
            aria-label="Flip Camera"
          >
            <RefreshCw className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
}

export default CameraView;
