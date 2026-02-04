'use client';
import './globals.css';
import React from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body className="antialiased bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}