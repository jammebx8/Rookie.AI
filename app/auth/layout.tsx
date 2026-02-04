'use client';
import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Basic layout wrapper for all routes under /auth
  return (
    <div className="min-h-screen bg-black text-white">
      {children}
    </div>
  );
}