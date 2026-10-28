'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, CheckCircle2, Mic } from 'lucide-react';
import toast from 'react-hot-toast';
import { triggerCheckout, bustPassCache } from '@/lib/rookiePass';
import { supabase } from '@/public/src/utils/supabase';

interface DoubtLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPassGranted?: () => void;
  isDark?: boolean;
}

export function DoubtLimitModal({
  isOpen,
  onClose,
  onPassGranted,
  isDark = true,
}: DoubtLimitModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to upgrade to Rookie Pass');
        setLoading(false);
        return;
      }

      const raw = typeof window !== 'undefined' ? localStorage.getItem('@user') : null;
      const user = raw ? JSON.parse(raw) : null;

      await triggerCheckout({
        token: session.access_token,
        userId: session.user.id,
        email: session.user.email,
        name: user?.name ?? null,
        onSuccess: () => {
          bustPassCache();
          toast.success('Rookie Pass activated! Enjoy unlimited doubts.');
          onPassGranted?.();
          onClose();
        },
        onError: (err) => {
          toast.error(err || 'Payment failed. Please try again.');
        },
        onDismiss: () => {
          setLoading(false);
        },
      });
    } catch (err: any) {
      console.error('Checkout error:', err);
      toast.error('Could not initiate checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={`relative w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border ${
            isDark
              ? 'bg-[#12141c] border-neutral-800 text-white'
              : 'bg-white border-neutral-200 text-neutral-900'
          }`}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon Badge */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white mb-5 shadow-lg shadow-blue-500/30">
            <Mic className="w-7 h-7" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-3">
            <span>Free limit: 3/3 doubts used today</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
            Unlock Unlimited AI Doubts
          </h3>

          <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
            Free users get 3 doubts per day. Upgrade to Rookie Pass to ask unlimited voice doubts with instant step-by-step LaTeX explanations.
          </p>

          {/* Benefits */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>Unlimited Voice AI Tutor doubts 24/7</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>Full question & solution reasoning with LaTeX</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>JEE Advanced PYQs & Unlimited Tests</span>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-2xl font-bold text-white text-base shadow-xl flex items-center justify-center gap-2 transition-all active:scale-98"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
            }}
          >
            <Sparkles className="w-5 h-5" />
            <span>{loading ? 'Opening checkout...' : 'Get Rookie Pass — ₹299/year'}</span>
          </button>

          <button
            onClick={onClose}
            className="w-full mt-3 py-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors text-center"
          >
            Resets tomorrow · Maybe later
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
export default DoubtLimitModal;
