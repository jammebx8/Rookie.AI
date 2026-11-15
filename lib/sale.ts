/**
 * Dynamic Rookie Pass Pricing & Sales
 * -----------------------------------
 * Resolves pricing dynamically per user:
 * 1. Active custom sale in public.user_custom_sales (set by admin in rookie-dash)
 * 2. 48-hour welcome sale (60% off = ₹399) from user signup timestamp
 * 3. Base annual price: ₹999 once the 48-hour timer hits zero
 */

import * as React from 'react';
import { supabase } from '@/public/src/utils/supabase';

export const BASE_PASS_PRICE = 999;
export const WELCOME_PASS_PRICE = 399;

export const sale = {
  name: 'Welcome Offer',
  currency: '₹',
  original: 999,
  price: 399,
  per: 'year',
  endsAt: '2026-11-17T23:59:59+05:30',
  perks: ['Every JEE Main & Advanced PYQ', 'Unlimited AI solutions', 'Unlimited custom tests'],
};

export const saleMoney = (n: number) => `${sale.currency}${n.toLocaleString('en-IN')}`;
export const saleOff = Math.round((1 - sale.price / sale.original) * 100);
export const salePerMonth = Math.round(sale.price / 12);

export interface UserSaleConfig {
  price: number;
  original: number;
  currency: string;
  per: string;
  isSaleLive: boolean;
  endsAt: string | null;
  saleType: 'welcome' | 'custom' | 'none';
  discountPct: number;
  label: string;
  perMonth: number;
  perks: string[];
}

export function computeLocalUserSale(userCreatedAt?: string | null): UserSaleConfig {
  const original = BASE_PASS_PRICE;
  const currency = '₹';
  const per = 'year';
  const perks = sale.perks;

  if (!userCreatedAt) {
    // Default welcome preview for visitors
    return {
      price: WELCOME_PASS_PRICE,
      original,
      currency,
      per,
      isSaleLive: true,
      endsAt: null,
      saleType: 'welcome',
      discountPct: 60,
      label: 'Welcome Offer (60% OFF)',
      perMonth: Math.round(WELCOME_PASS_PRICE / 12),
      perks,
    };
  }

  const signupMs = new Date(userCreatedAt).getTime();
  const welcomeEndMs = signupMs + 48 * 3600 * 1000; // 48 hours from signup
  const now = Date.now();

  if (now < welcomeEndMs) {
    return {
      price: WELCOME_PASS_PRICE,
      original,
      currency,
      per,
      isSaleLive: true,
      endsAt: new Date(welcomeEndMs).toISOString(),
      saleType: 'welcome',
      discountPct: 60,
      label: 'Welcome Offer (60% OFF)',
      perMonth: Math.round(WELCOME_PASS_PRICE / 12),
      perks,
    };
  }

  // Timer reached zero -> Base Price ₹999
  return {
    price: BASE_PASS_PRICE,
    original,
    currency,
    per,
    isSaleLive: false,
    endsAt: null,
    saleType: 'none',
    discountPct: 0,
    label: 'Standard Annual Pass',
    perMonth: Math.round(BASE_PASS_PRICE / 12),
    perks,
  };
}

/**
 * React hook that returns dynamic pricing and live timer for the active user.
 * Automatically updates when timer reaches 0 without page refresh.
 */
export function useUserPricing(): UserSaleConfig {
  const [config, setConfig] = React.useState<UserSaleConfig>(() => computeLocalUserSale(null));

  React.useEffect(() => {
    let alive = true;

    async function loadPricing() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let userCreatedAt: string | null = null;
        let userId: string | null = null;

        if (session?.user) {
          userCreatedAt = session.user.created_at ?? null;
          userId = session.user.id;
        } else {
          try {
            const raw = localStorage.getItem('@user');
            if (raw) {
              const u = JSON.parse(raw);
              userCreatedAt = u.created_at ?? null;
              userId = u.id ?? null;
            }
          } catch {}
        }

        // 1. Initial fast local calculation
        const local = computeLocalUserSale(userCreatedAt);
        if (alive) setConfig(local);

        // 2. Fetch server-side pricing to check for active custom discount
        if (userId) {
          const res = await fetch('/api/pricing', {
            headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
          });
          if (res.ok) {
            const json = await res.json();
            if (alive) {
              setConfig({
                price: json.price ?? local.price,
                original: json.basePrice ?? BASE_PASS_PRICE,
                currency: '₹',
                per: 'year',
                isSaleLive: Boolean(json.isSaleLive),
                endsAt: json.endsAt ?? null,
                saleType: json.saleType ?? local.saleType,
                discountPct: json.discountPct ?? local.discountPct,
                label: json.label ?? local.label,
                perMonth: Math.round((json.price ?? local.price) / 12),
                perks: sale.perks,
              });
            }
          }
        }
      } catch {
        // Fall back to local calculation
      }
    }

    loadPricing();

    // Re-check when window gains focus or pass updates
    const onRefresh = () => loadPricing();
    window.addEventListener('focus', onRefresh);
    window.addEventListener('rookiePassUpdated', onRefresh);

    return () => {
      alive = false;
      window.removeEventListener('focus', onRefresh);
      window.removeEventListener('rookiePassUpdated', onRefresh);
    };
  }, []);

  // Timer expiry check: flips to ₹999 when countdown ends
  React.useEffect(() => {
    if (!config.isSaleLive || !config.endsAt) return;
    const endMs = new Date(config.endsAt).getTime();

    const interval = setInterval(() => {
      if (Date.now() >= endMs) {
        setConfig((prev) => ({
          ...prev,
          price: BASE_PASS_PRICE,
          isSaleLive: false,
          endsAt: null,
          saleType: 'none',
          discountPct: 0,
          label: 'Standard Annual Pass',
          perMonth: Math.round(BASE_PASS_PRICE / 12),
        }));
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [config.isSaleLive, config.endsAt]);

  return config;
}
