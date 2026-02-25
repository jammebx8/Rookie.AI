'use client';
import './globals.css';
import React, { useEffect } from 'react';

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDLT7r8UKs-0lXavLkl2U8KMHcTpnx52P4",
  authDomain: "rookie-9af29.firebaseapp.com",
  projectId: "rookie-9af29",
  storageBucket: "rookie-9af29.firebasestorage.app",
  messagingSenderId: "943826801296",
  appId: "1:943826801296:web:e5d4f27ba3247ac3f33e15",
  measurementId: "G-0TKCRQ8PYG"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    getAnalytics(app);
  }, []);

  return (
    <html lang="en">
      <head />
      <body className="antialiased bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}