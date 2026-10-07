'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiAward } from 'react-icons/fi';
import { supabase } from '@/public/src/utils/supabase';

type Tab = {
  name: string;
  path: string;
  iconFilled: string;
  iconUnfilled: string;
};

const headerVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const navVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
};

// Sun icon SVG
const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

// Moon icon SVG
const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

// App Logo SVG (custom)
const AppLogo = ({ isDark }: { isDark: boolean }) => (
  <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="10" fill={isDark ? '#171717' : '#F5F5F5'}/>
    <path d="M10 28L20 10L30 28" stroke={isDark ? '#FFFFFF' : '#000000'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13.5 22H26.5" stroke={isDark ? '#FFFFFF' : '#000000'} strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="20" cy="10" r="2" fill={isDark ? '#E5E5E5' : '#262626'}/>
  </svg>
);

// Bookmark icon SVG
const BookmarkIcon = ({ isDark }: { isDark: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#A3A3A3' : '#737373'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
  </svg>
);

// Tests (clipboard-check) icon SVG
const TestsNavIcon = ({ active, isDark }: { active: boolean; isDark: boolean }) => {
  const col = active
    ? (isDark ? '#ffffff' : '#000000')
    : (isDark ? '#737373' : '#A3A3A3')
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  )
}

export default function TabLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [rookieCoins, setRookieCoins] = useState(0);
  const [isDark, setIsDark] = useState(true);
  // Badge on bookmark tab — count of unseen wrong-answer auto-bookmarks
  const [wrongBadge, setWrongBadge] = useState(0);

  useEffect(() => {
    // Read badge count on mount + listen for updates from practice/questionviewer
    const readBadge = () => {
      try { setWrongBadge(parseInt(localStorage.getItem('rookie_wrong_bookmarks') || '0', 10)) } catch {}
    }
    readBadge()
    window.addEventListener('wrongBadgeUpdated', readBadge)
    window.addEventListener('storage', (e) => { if (e.key === 'rookie_wrong_bookmarks') readBadge() })
    return () => window.removeEventListener('wrongBadgeUpdated', readBadge)
  }, []);

  // Load theme from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light') {
      setIsDark(false);
      document.documentElement.classList.add('light-mode');
    } else {
      setIsDark(true);
      document.documentElement.classList.remove('light-mode');
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    if (next) {
      document.documentElement.classList.remove('light-mode');
    } else {
      document.documentElement.classList.add('light-mode');
    }
  };

  useEffect(() => {
    const loadUserCoins = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('users')
            .select('rookieCoinsEarned')
            .eq('id', user.id)
            .single();
          if (!error && data) {
            setRookieCoins(data.rookieCoinsEarned || 0);
          }
        }
      } catch (err) {
        console.error('Error loading user coins:', err);
      }
    };
    loadUserCoins();
  }, []);

  const tabs: Tab[] = [
    {
      name: 'Home',
      path: '/home',
      iconFilled: '/home_filled.png',
      iconUnfilled: '/home_unfilled.png',
    },
    {
      name: 'LeaderBoard',
      path: '/leaderboard',
      iconFilled: '/trophy-fill.png',
      iconUnfilled: '/trophy.png',
    },
    {
      name: 'Tests',
      path: '/tests',
      iconFilled: '/tests_filled.png',
      iconUnfilled: '/tests_unfilled.png',
    },
    {
      name: 'Practice',
      path: '/explore',
      iconFilled: '/book_filled.png',
      iconUnfilled: '/book_unfilled.png',
    },
    {
      name: 'Bookmarks',
      path: '/bookmark',
      iconFilled: '/bookmark-simple-fill.png',
      iconUnfilled: '/bookmark-simple.png',
    },
   

  
    
  ];

  const settingsTab = {
    name: 'Settings',
    path: '/profile',
    iconFilled: '/set_fill.png',
    iconUnfilled: '/set_unfilled.png',
  };

 
  const isSettingsActive = pathname === '/profile';

  // Colors based on theme (monochrome: black / white / neutral greys only)
  const bg = isDark ? 'bg-[#000000]' : 'bg-[#FAFAFA]';
  const headerBg = isDark ? 'bg-[#000000]' : 'bg-white';
  const borderColor = isDark ? 'border-[#262626]' : 'border-[#E5E5E5]';
  const sidebarBg = isDark ? 'bg-[#0A0A0A]' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-[#000000]';
  const textMuted = isDark ? 'text-neutral-500' : 'text-neutral-400';
  const coinsBg = isDark ? 'bg-[#0A0A0A] border-[#262626]' : 'bg-white border-[#E5E5E5]';
  const coinsText = isDark ? 'text-white' : 'text-[#000000]';

  return (
    <div className={`flex flex-col min-h-screen ${bg} transition-colors duration-300`}>

      {/* ─── HEADER ──────────────────────────────────────────── */}
      <motion.header
        className={`sticky top-0 z-50 ${headerBg} border-b ${borderColor} transition-colors duration-300`}
        initial="hidden"
        animate="visible"
        variants={headerVariants}
      >
        <div className="">
          <div className="flex items-center justify-between h-12 sm:h-14 px-4 sm:px-6">

            {/* Logo (SVG, no image file needed) */}
            <div className="flex items-center gap-2.5">
            <Image
  src="/icon.svg"
  alt="Rookie Logo"
  width={36}
  height={36}
  priority
  
/>
<Image
  src="/lg.png"
  alt="Rookie"
  width={76}
  height={76}
  priority
  className={isDark ? "" : "invert"}
/>
            </div>

            {/* Right side: coins + theme toggle */}
            <div className="flex items-center gap-2">
              {/* Rookie Coins */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg ${coinsBg} transition-colors duration-300`}>
              <Image
  src="coin (1).svg"
  alt="Coins"
  width={16}
  height={16}
/>
                <span className={`font-semibold text-xs sm:text-sm ${coinsText}`}>{rookieCoins}</span>
              </div>

              {/* Theme Toggle */}
              <motion.button
                onClick={toggleTheme}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg transition-colors duration-300 ${
                  isDark
                    ? 'bg-[#0A0A0A] border-[#262626] text-neutral-300 hover:border-neutral-500'
                    : 'bg-neutral-100 border-[#E5E5E5] text-neutral-700 hover:bg-neutral-200'
                }`}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                aria-label="Toggle theme"
                type="button"
              >
                <motion.span
                  key={isDark ? 'moon' : 'sun'}
                  initial={{ rotate: -30, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  {isDark ? <MoonIcon /> : <SunIcon />}
                </motion.span>
                <span className="text-xs font-medium hidden sm:block">
                  {isDark ? 'Dark' : 'Light'}
                </span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* ─── BODY (sidebar + main) ─────────────────────────────── */}
      <div className="flex flex-1 relative">

        {/* ─── DESKTOP SIDEBAR ──────────────────────────────────── */}
        <motion.aside
          className={`hidden lg:flex flex-col fixed left-0 top-12 sm:top-14 bottom-0 w-62  ${sidebarBg} border-r ${borderColor} z-30 transition-colors duration-300`}
          initial="hidden"
          animate="visible"
          variants={navVariants}
        >
          {/* Nav links */}
          <nav className="flex-1 px-3 pt-4 pb-4 space-y-1 ">
            {tabs.map((tab) => {
              const isActive = pathname === tab.path;
              return (
                <Link
                  key={tab.path}
                  href={tab.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? isDark
                        ? 'bg-[#171717] text-white'
                        : 'bg-neutral-100 text-[#000000]'
                      : isDark
                        ? 'text-neutral-400 hover:text-white hover:bg-white/5'
                        : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >

                  
                  <div className="w-8 h-8 flex-shrink-0 relative mt-2">
                    {tab.path === '/tests' ? (
                      <TestsNavIcon active={isActive} isDark={isDark} />
                    ) : (
                    <Image
                      src={isActive ? tab.iconFilled : tab.iconUnfilled}
                      alt={tab.name}
                      width={20}
                      height={20}
                      className={`object-contain ${
                        isActive
                          ? isDark
                            ? 'brightness-0 invert'
                            : 'brightness-0 saturate-100'
                          : isDark
                            ? 'brightness-0 invert opacity-50'
                            : 'brightness-0 opacity-40'
                      }`}
                      priority={isActive}
                    />
                    )}
                    {/* Badge on Bookmarks tab */}
                    {tab.path === '/bookmark' && wrongBadge > 0 && (
                      <span className={`absolute -top-1 -right-1 min-w-[16px] h-4 ${isDark ? 'bg-white text-black' : 'bg-black text-white'} text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none`}>
                        {wrongBadge > 99 ? '99+' : wrongBadge}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium">{tab.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className={`absolute left-0 w-1 h-7 rounded-r-full ${isDark ? 'bg-white' : 'bg-black'}`}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Settings at bottom of sidebar */}
<div className={`px-3 pb-4 border-t ${borderColor} pt-4`}>
  <button
    onClick={() => router.push('/profile')}
    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200 ${
      isDark
        ? 'text-neutral-400 hover:text-white hover:bg-white/5'
        : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
    }`}
    type="button"
  >
  <Image
  src={
    isSettingsActive
      ? settingsTab?.iconFilled || '/set_fill.png'
      : settingsTab?.iconUnfilled || '/set_unfilled.png'
  }
  alt="Settings"
  width={20}
  height={20}
  className={`object-contain ${
    isSettingsActive
      ? isDark
        ? 'brightness-0 invert'
        : 'brightness-0'
      : isDark
        ? 'brightness-0 invert opacity-50'
        : 'brightness-0 opacity-40'
  }`}
/>
    
    <span className="text-sm font-medium">Settings</span>
  </button>
</div>
        </motion.aside>

        {/* ─── MAIN CONTENT ─────────────────────────────────────── */}
        <main className="flex-1 pb-20 lg:pb-6 lg:ml-52 transition-all duration-300">
          {children}
        </main>
      </div>

      {/* ─── MOBILE BOTTOM TAB NAV ────────────────────────────── */}
      <motion.nav
        className={`lg:hidden fixed bottom-0 left-0 right-0 ${headerBg} border-t ${borderColor} z-40 transition-colors duration-300`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-around h-14 px-2">
          {tabs.map((tab) => {
            const isActive = pathname === tab.path;
            return (
              <Link
                key={tab.path}
                href={tab.path}
                className="flex flex-col items-center justify-center flex-1 py-2"
                aria-current={isActive ? 'page' : undefined}
              >
                <motion.div
                  className="flex flex-col items-center justify-center"
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                >
                  <div className="relative w-5 h-5 mb-1">
                    {tab.path === '/tests' ? (
                      <TestsNavIcon active={isActive} isDark={isDark} />
                    ) : (
                    <Image
                      src={isActive ? tab.iconFilled : tab.iconUnfilled}
                      alt={tab.name}
                      width={20}
                      height={20}
                      className={`object-contain transition-opacity duration-200 ${
                        isActive
                          ? isDark
                            ? 'brightness-0 invert'
                            : 'brightness-0'
                          : isDark
                            ? 'brightness-0 invert opacity-40'
                            : 'brightness-0 opacity-30'
                      }`}
                      priority={isActive}
                    />
                    )}
                    {/* Badge on Bookmarks tab */}
                    {tab.path === '/bookmark' && wrongBadge > 0 && (
                      <span className={`absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 ${isDark ? 'bg-white text-black' : 'bg-black text-white'} text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none`}>
                        {wrongBadge > 9 ? '9+' : wrongBadge}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-medium ${
                      isActive
                        ? isDark ? 'text-white' : 'text-black'
                        : textMuted
                    }`}
                  >
                    {tab.name}
                  </span>
                </motion.div>
              </Link>
            );
          })}

          {/* Bookmark as last tab on mobile */}
          <button
            onClick={() => router.push('/profile')}
            className="flex flex-col items-center justify-center flex-1 py-2"
            type="button"
            aria-label="Bookmarks"
          >
            <div className="mb-1">
            <Image
  src={
    isSettingsActive
      ? settingsTab?.iconFilled || '/set_fill.png'
      : settingsTab?.iconUnfilled || '/set_unfilled.png'
  }
  alt="Settings"
  width={20}
  height={20}
  className={`object-contain ${
    isSettingsActive
      ? isDark
        ? 'brightness-0 invert'
        : 'brightness-0'
      : isDark
        ? 'brightness-0 invert opacity-50'
        : 'brightness-0 opacity-40'
  }`}
/>
            </div>
            <span className={`text-[10px] font-medium ${textMuted}`}>Settings</span>
          </button>
        </div>
      </motion.nav>

    </div>
  );
}