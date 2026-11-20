'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/lib/analytics';

export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    // Track website visit / pageview
    trackPageView(pathname);
  }, [pathname]);

  return null;
}
