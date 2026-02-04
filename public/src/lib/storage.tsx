// src/lib/storage.ts
import { User, AIBuddy } from '@/types';

// Client-side only storage utilities
export const storage = {
  getUser: async (): Promise<User | null> => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('@user');
    return userStr ? JSON.parse(userStr) : null;
  },

  setUser: async (user: User): Promise<void> => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('@user', JSON.stringify(user));
  },

  getCoins: async (): Promise<number> => {
    if (typeof window === 'undefined') return 0;
    const userStr = localStorage.getItem('@user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return Number(user?.rookieCoinsEarned) || 0;
    }
    return 0;
  },

  getSelectedBuddy: async (): Promise<AIBuddy | null> => {
    if (typeof window === 'undefined') return null;
    const buddyStr = localStorage.getItem('selectedBuddy');
    return buddyStr ? JSON.parse(buddyStr) : null;
  },

  setSelectedBuddy: async (buddy: AIBuddy): Promise<void> => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('selectedBuddy', JSON.stringify(buddy));
  },

  clearAll: async (): Promise<void> => {
    if (typeof window === 'undefined') return;
    const keysToRemove = [
      '@user',
      '@user_extra',
      '@user_onboarded',
      'selectedBuddy',
      'rookieCoins',
      'sb-rzcizwacjexolkjjczbt-auth-token',
      'bookmarkedQuestions',
    ];
    
    // Also remove chat histories
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (key.startsWith('chat_')) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
};