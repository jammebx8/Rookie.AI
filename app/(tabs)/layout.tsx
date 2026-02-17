'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { color, motion } from 'framer-motion';
import { FiAward } from 'react-icons/fi';
import { supabase } from '@/public/src/utils/supabase';


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
  const [rookieCoins, setRookieCoins] = useState(0);


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
         <div className="flex items-center gap-2 px-3 py-2 bg-[#151B27] border border-[#1D2939] rounded-xl">
                       <FiAward className="text-yellow-500" />
                       <span className="font-semibold">{rookieCoins}</span>
                     </div>

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