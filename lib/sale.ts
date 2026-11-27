/**
 * Dynamic Rookie Pass Pricing & Sales
 * -----------------------------------
 * Resolves pricing dynamically per user:
 * 1. Active custom sale in public.user_custom_sales (set by admin in rookie-dash)
 * 2. Standard annual price: ₹399 / year
 */

import * as React from 'react';
import { supabase } from '@/public/src/utils/supabase';

export const BASE_PASS_PRICE = 399;
export const WELCOME_PASS_PRICE = 399;

export const sale = {
  name: 'Rookie Pass',
  currency: '₹',
  original: 399,
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

export function computeLocalUserSale(_userCreatedAt?: string | null): UserSaleConfig {
  const original = BASE_PASS_PRICE;
  const currency = '₹';
  const per = 'year';
  const perks = sale.perks;

  // Standard annual base price: ₹399
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

export function isConfigEqual(a?: UserSaleConfig | null, b?: UserSaleConfig | null): boolean {
  if (!a || !b) return a === b;
  return (
    a.price === b.price &&
    a.original === b.original &&
    a.isSaleLive === b.isSaleLive &&
    a.endsAt === b.endsAt &&
    a.discountPct === b.discountPct &&
    a.saleType === b.saleType
  );
}

const PRICING_CACHE_KEY = 'rookie_pricing_cache';
const PRICING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function readPricingCache(): UserSaleConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PRICING_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.config && Date.now() - parsed.fetched_at < PRICING_CACHE_TTL) {
      if (parsed.config.endsAt && new Date(parsed.config.endsAt).getTime() <= Date.now()) {
        return null;
      }
      return parsed.config;
    }
  } catch {}
  return null;
}

function writePricingCache(config: UserSaleConfig) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      PRICING_CACHE_KEY,
      JSON.stringify({ config, fetched_at: Date.now() })
    );
  } catch {}
}

export function clearPricingCache() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(PRICING_CACHE_KEY);
  } catch {}
}

/**
 * React hook that returns dynamic pricing and live timer for the active user.
 * Automatically updates when timer reaches 0 without page refresh.
 */
export function useUserPricing(): UserSaleConfig {
  const [config, setConfig] = React.useState<UserSaleConfig>(() => {
    const cached = readPricingCache();
    if (cached) return cached;

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('@user');
        if (raw) {
          const u = JSON.parse(raw);
          if (u.created_at) return computeLocalUserSale(u.created_at);
        }
      } catch {}
    }
    return computeLocalUserSale(null);
  });

  const lastFetchRef = React.useRef<number>(0);

  React.useEffect(() => {
    let alive = true;

    async function loadPricing(force = false) {
      const now = Date.now();
      // Throttle rapid re-fetches (e.g. switching browser tabs back and forth within 30s)
      if (!force && lastFetchRef.current > 0 && now - lastFetchRef.current < 30000) {
        return;
      }

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

        // If not logged in, calculate local and update only if changed
        if (!userId) {
          const local = computeLocalUserSale(userCreatedAt);
          if (alive) {
            setConfig(prev => (isConfigEqual(prev, local) ? prev : local));
          }
          return;
        }

        // For logged-in user:
        // Do NOT overwrite current config with local fallback before network fetch!
        // This avoids glitching/hiding custom discounts on tab refocus.
        const res = await fetch('/api/pricing', {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        });

        if (res.ok) {
          const json = await res.json();
          lastFetchRef.current = Date.now();
          if (alive) {
            const serverConfig: UserSaleConfig = {
              price: json.price ?? BASE_PASS_PRICE,
              original: json.basePrice ?? BASE_PASS_PRICE,
              currency: '₹',
              per: 'year',
              isSaleLive: Boolean(json.isSaleLive),
              endsAt: json.endsAt ?? null,
              saleType: json.saleType ?? (json.isSaleLive ? 'welcome' : 'none'),
              discountPct: json.discountPct ?? (json.basePrice && json.price ? Math.round((1 - json.price / json.basePrice) * 100) : 0),
              label: json.label ?? (json.isSaleLive ? 'Welcome Offer' : 'Standard Annual Pass'),
              perMonth: Math.round((json.price ?? BASE_PASS_PRICE) / 12),
              perks: sale.perks,
            };

            writePricingCache(serverConfig);

            setConfig(prev => (isConfigEqual(prev, serverConfig) ? prev : serverConfig));
          }
        } else {
          // If server call fails, fallback to local only if we don't have any pricing yet
          const local = computeLocalUserSale(userCreatedAt);
          if (alive) {
            setConfig(prev => (prev ? prev : local));
          }
        }
      } catch {
        // Keep existing config on error
      }
    }

    loadPricing();

    // Re-check when window gains focus or pass updates
    const onFocus = () => loadPricing(false);
    const onPassUpdated = () => {
      clearPricingCache();
      loadPricing(true);
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('rookiePassUpdated', onPassUpdated);

    return () => {
      alive = false;
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('rookiePassUpdated', onPassUpdated);
    };
  }, []);

  // Timer expiry check: flips to ₹399 when countdown ends
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
