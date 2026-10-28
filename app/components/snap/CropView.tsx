'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface CropViewProps {
  imageSrc: string;
  onConfirm: (croppedImageBase64: string) => void;
  onClose: () => void;
}

interface CropBox {
  x: number; // percentage (0 to 100)
  y: number;
  width: number;
  height: number;
}

export function CropView({ imageSrc, onConfirm, onClose }: CropViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Crop box in percentages relative to the displayed image
  const [crop, setCrop] = useState<CropBox>({
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  });

  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; crop: CropBox } | null>(null);

  // Start dragging a handle or the box body
  const handlePointerDown = (handle: string, e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveHandle(handle);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      crop: { ...crop },
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeHandle || !dragStartRef.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStartRef.current.clientX) / rect.width) * 100;
    const dy = ((e.clientY - dragStartRef.current.clientY) / rect.height) * 100;

    const start = dragStartRef.current.crop;
    let nextCrop = { ...start };

    const minSize = 15; // minimum 15% width/height

    if (activeHandle === 'move') {
      nextCrop.x = Math.max(0, Math.min(100 - start.width, start.x + dx));
      nextCrop.y = Math.max(0, Math.min(100 - start.height, start.y + dy));
    } else {
      // Corner: top-left
      if (activeHandle.includes('tl')) {
        const newX = Math.max(0, Math.min(start.x + start.width - minSize, start.x + dx));
        const newY = Math.max(0, Math.min(start.y + start.height - minSize, start.y + dy));
        nextCrop.width = start.width + (start.x - newX);
        nextCrop.height = start.height + (start.y - newY);
        nextCrop.x = newX;
        nextCrop.y = newY;
      }
      // Corner: top-right
      if (activeHandle.includes('tr')) {
        const newY = Math.max(0, Math.min(start.y + start.height - minSize, start.y + dy));
        nextCrop.width = Math.max(minSize, Math.min(100 - start.x, start.width + dx));
        nextCrop.height = start.height + (start.y - newY);
        nextCrop.y = newY;
      }
      // Corner: bottom-left
      if (activeHandle.includes('bl')) {
        const newX = Math.max(0, Math.min(start.x + start.width - minSize, start.x + dx));
        nextCrop.width = start.width + (start.x - newX);
        nextCrop.height = Math.max(minSize, Math.min(100 - start.y, start.height + dy));
        nextCrop.x = newX;
      }
      // Corner: bottom-right
      if (activeHandle.includes('br')) {
        nextCrop.width = Math.max(minSize, Math.min(100 - start.x, start.width + dx));
        nextCrop.height = Math.max(minSize, Math.min(100 - start.y, start.height + dy));
      }

      // Edges: top, bottom, left, right
      if (activeHandle === 't') {
        const newY = Math.max(0, Math.min(start.y + start.height - minSize, start.y + dy));
        nextCrop.height = start.height + (start.y - newY);
        nextCrop.y = newY;
      }
      if (activeHandle === 'b') {
        nextCrop.height = Math.max(minSize, Math.min(100 - start.y, start.height + dy));
      }
      if (activeHandle === 'l') {
        const newX = Math.max(0, Math.min(start.x + start.width - minSize, start.x + dx));
        nextCrop.width = start.width + (start.x - newX);
        nextCrop.x = newX;
      }
      if (activeHandle === 'r') {
        nextCrop.width = Math.max(minSize, Math.min(100 - start.x, start.width + dx));
      }
    }

    setCrop(nextCrop);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setActiveHandle(null);
    dragStartRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Perform the crop on the real underlying image
  const doCropAndConfirm = () => {
    const img = imageRef.current;
    if (!img) return;

    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;

    const cropPixelX = (crop.x / 100) * naturalWidth;
    const cropPixelY = (crop.y / 100) * naturalHeight;
    const cropPixelWidth = (crop.width / 100) * naturalWidth;
    const cropPixelHeight = (crop.height / 100) * naturalHeight;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(cropPixelWidth));
    canvas.height = Math.max(1, Math.round(cropPixelHeight));

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      img,
      cropPixelX,
      cropPixelY,
      cropPixelWidth,
      cropPixelHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.95);
    onConfirm(croppedBase64);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none">
      {/* Top Bar */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-4 pb-3">
        <div className="w-10" />
        <h1 className="text-white text-lg sm:text-xl font-bold tracking-tight">
          Crop &amp; continue
        </h1>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Image Viewport with Crop Overlay */}
      <div className="relative flex-1 w-full max-w-lg mx-auto flex items-center justify-center p-4 overflow-hidden">
        <div
          ref={containerRef}
          className="relative inline-block max-w-full max-h-[70vh] shadow-2xl overflow-hidden rounded-lg touch-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Base Image */}
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Snap for cropping"
            className="max-w-full max-h-[70vh] object-contain block select-none pointer-events-none"
            draggable={false}
          />

          {/* Dimmed backdrop outside crop area (CSS clip-path or dark overlay) */}
          <div
            className="absolute inset-0 bg-black/60 pointer-events-none"
            style={{
              clipPath: `polygon(
                0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
                ${crop.x}% ${crop.y}%,
                ${crop.x + crop.width}% ${crop.y}%,
                ${crop.x + crop.width}% ${crop.y + crop.height}%,
                ${crop.x}% ${crop.y + crop.height}%,
                ${crop.x}% ${crop.y}%
              )`,
            }}
          />

          {/* Active Crop Box */}
          <div
            className="absolute cursor-move border border-white/60"
            style={{
              left: `${crop.x}%`,
              top: `${crop.y}%`,
              width: `${crop.width}%`,
              height: `${crop.height}%`,
            }}
            onPointerDown={(e) => handlePointerDown('move', e)}
          >
            {/* 3x3 Rule of Thirds Grid inside crop area */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 bottom-0 left-1/3 w-[1px] bg-white/30" />
              <div className="absolute top-0 bottom-0 left-2/3 w-[1px] bg-white/30" />
              <div className="absolute left-0 right-0 top-1/3 h-[1px] bg-white/30" />
              <div className="absolute left-0 right-0 top-2/3 h-[1px] bg-white/30" />
            </div>

            {/* 4 Corner Markers (as in Screenshot 3) */}
            {/* Top-left */}
            <div
              className="absolute -top-1.5 -left-1.5 w-7 h-7 border-t-[4px] border-l-[4px] border-white rounded-tl-[8px] cursor-nwse-resize z-20"
              onPointerDown={(e) => handlePointerDown('tl', e)}
            />
            {/* Top-right */}
            <div
              className="absolute -top-1.5 -right-1.5 w-7 h-7 border-t-[4px] border-r-[4px] border-white rounded-tr-[8px] cursor-nesw-resize z-20"
              onPointerDown={(e) => handlePointerDown('tr', e)}
            />
            {/* Bottom-left */}
            <div
              className="absolute -bottom-1.5 -left-1.5 w-7 h-7 border-b-[4px] border-l-[4px] border-white rounded-bl-[8px] cursor-nesw-resize z-20"
              onPointerDown={(e) => handlePointerDown('bl', e)}
            />
            {/* Bottom-right */}
            <div
              className="absolute -bottom-1.5 -right-1.5 w-7 h-7 border-b-[4px] border-r-[4px] border-white rounded-br-[8px] cursor-nwse-resize z-20"
              onPointerDown={(e) => handlePointerDown('br', e)}
            />

            {/* 4 Edge Handles (center indicators) */}
            {/* Top edge */}
            <div
              className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-white/80 rounded-full cursor-ns-resize z-20"
              onPointerDown={(e) => handlePointerDown('t', e)}
            />
            {/* Bottom edge */}
            <div
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-white/80 rounded-full cursor-ns-resize z-20"
              onPointerDown={(e) => handlePointerDown('b', e)}
            />
            {/* Left edge */}
            <div
              className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-8 bg-white/80 rounded-full cursor-ew-resize z-20"
              onPointerDown={(e) => handlePointerDown('l', e)}
            />
            {/* Right edge */}
            <div
              className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-8 bg-white/80 rounded-full cursor-ew-resize z-20"
              onPointerDown={(e) => handlePointerDown('r', e)}
            />
          </div>
        </div>
      </div>

      {/* Bottom Button Bar */}
      <div className="relative z-20 pb-8 pt-4 px-6 max-w-sm mx-auto w-full">
        <button
          onClick={doCropAndConfirm}
          className="w-full py-4 px-8 rounded-full bg-white text-black font-semibold text-base sm:text-lg hover:bg-neutral-100 active:scale-98 shadow-2xl transition-all duration-200"
        >
          Crop &amp; continue
        </button>
      </div>
    </div>
  );
}

export default CropView;
