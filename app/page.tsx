import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold">App root</h1>
        <p className="mt-4">Open the auth flow: <Link href="/auth" className="text-blue-400 underline">/auth</Link></p>
      </div>
    </main>
  );
}