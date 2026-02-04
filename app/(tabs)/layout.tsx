'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { color, motion } from 'framer-motion';


type Tab = {
  name: string;
  path: string;
  iconFilled: string;
  iconUnfilled: string;
};

const headerVariants = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45,  } },
};

const navVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45,  } },
};

const tabIconHover = { scale: 1.08 };
const tabIconTap = { scale: 0.96 };

export default function TabLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [coins, setCoins] = useState<number>(0);

  // useEffect(() => {
  //   const loadCoins = async () => {
  //     try {
  //      const coinAmount = await storage.getCoins();
  //       setCoins(coinAmount);
  //     } catch (err) {
  //       // eslint-disable-next-line no-console
  //       console.error('Failed to load coins', err);
  //       setCoins(0);
  //     }
  //   };

  //   loadCoins();
  // }, []);

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
      name: 'Practice',
      path: '/explore',
      iconFilled: '/book_filled.png',
      iconUnfilled: '/book_unfilled.png',
    },
    {
      name: 'Settings',
      path: '/profile',
      iconFilled: '/set_filled.png',
      iconUnfilled: '/set_unfilled.png',
    },
  ];

  const showHeaderRight = pathname === '/' || pathname === '/explore';

  return (
    <div className="flex flex-col min-h-screen bg-[#000000]">
      {/* Header with framer animation */}
      <motion.header
        className="sticky top-0 z-50 bg-[#000000] border-b border-[#262626]"
        initial="hidden"
        animate="visible"
        variants={headerVariants}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex-shrink-0">
              {/* use a fixed width/height for Image to guarantee rendering;
                  using public/ path (leading slash) is correct for files in /public */}
              <Image
                src="/lg.png"
                alt="Logo"
                width={88}
                height={88}
                className="w-24 h-24 sm:w-24 sm:h-24 object-contain"
                priority
              />
            </div>

            {/* Header Right - Coins & Bookmark */}
            {showHeaderRight && (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Coin Badge */}
                <motion.button
                  className="flex items-center gap-1.5 sm:gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full px-3 py-1.5 sm:px-4 sm:py-2"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  aria-label="Coins"
                  type="button"
                >
                  <Image
                    src="/coin.png"
                    alt="Coin"
                    width={22}
                    height={22}
                    className="w-5 h-5 sm:w-6 sm:h-6"
                    priority
                  />
                  <span className="text-[#FFD700] font-bold text-sm sm:text-base tabular-nums">
                    {coins}
                  </span>
                </motion.button>

                {/* Bookmark Button */}
                <motion.button
                  onClick={() => router.push('/bookmark')}
                  className="p-1 sm:p-2"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.98 }}
                  aria-label="Bookmarks"
                  type="button"
                >
                  <Image
                    src="/bookmarkicon.png"
                    alt="Bookmark"
                    width={48}
                    height={36}
                    className="w-10 h-7 sm:w-12 sm:h-8 object-contain"
                    priority
                  />
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1 pb-20 sm:pb-24">{children}</main>

      {/* Bottom Tab Navigation with framer animation */}
      <motion.nav
        className="fixed bottom-0 left-0 right-0 bg-[#000000] border-t border-[#262626] z-40 shadow-lg"
        initial="hidden"
        animate="visible"
        variants={navVariants}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-around h-16 sm:h-20 px-2">
            {tabs.map((tab) => {
              const isActive = pathname === tab.path;

              // If icons in /public are not showing for you:
              // - ensure the files exist under the project's /public folder with the exact filenames
              // - using `src="/filename.png"` is the correct way to reference them from /public
              // - we use explicit width/height props so Next/Image will render reliably
              return (
                <Link
                  key={tab.path}
                  href={tab.path}
                  className="flex flex-col items-center justify-center flex-1 py-2 transition-colors"
                  aria-current={isActive ? 'page' : undefined}
                >
                  <motion.div
                    className="flex flex-col items-center justify-center"
                    whileHover={tabIconHover}
                    whileTap={tabIconTap}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  >
                    <div className="relative w-6 h-6 sm:w-6 sm:h-6 mb-1">
                    <Image
  src={isActive ? tab.iconFilled : tab.iconUnfilled}
  alt={tab.name}
  width={24}
  height={24}
  className={`object-contain transition-opacity duration-200 ${
    isActive 
      ? 'brightness-0 invert' // Turns the filled icon pure white
      : 'brightness-0 invert opacity-50' // Pure white but faded for "inactive" look
  }`}
  priority={isActive}
/>
                    </div>

                    <span
                      className={`text-xs sm:text-sm font-medium ${
                        isActive ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      {tab.name}
                    </span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </motion.nav>
    </div>
  );
}