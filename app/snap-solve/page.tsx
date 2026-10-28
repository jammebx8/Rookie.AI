'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SnapSolveModal } from '../components/snap/SnapSolveModal';

export default function SnapSolvePage() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    router.push('/home');
  };

  return (
    <div className="min-h-screen bg-black">
      <SnapSolveModal isOpen={isOpen} onClose={handleClose} isDark={true} />
    </div>
  );
}
