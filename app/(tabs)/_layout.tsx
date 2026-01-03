import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../src/utils/supabase';
import { Tabs, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  StatusBar,
  Text,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function TabLayout() {
  const router = useRouter();
  const [coins, setCoins] = useState<number>(0);

  // 🔹 Load coins from @user.rookieCoinsEarned
  useEffect(() => {
    const loadCoins = async () => {
      try {
        const userStr = await AsyncStorage.getItem('@user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setCoins(Number(user?.rookieCoinsEarned) || 0);
        } else {
          setCoins(0);
        }
      } catch (err) {
        console.error('Failed to load coins', err);
        setCoins(0);
      }
    };

    loadCoins();
  }, []);

  // 🪙 Coin Pill
  const CoinBadge = () => (
    <TouchableOpacity
      style={styles.coinBadge}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Image
        source={require('../../src/assets/images/coin.png')}
        style={styles.coinIcon}
        resizeMode="contain"
      />
      <Text style={styles.coinText}>{coins}</Text>
    </TouchableOpacity>
  );

  // 🔖 Bookmark Button
  const BookmarkButton = () => (
    <TouchableOpacity
      style={styles.bookmarkButton}
      onPress={() => router.push('/BookmarkScreen')}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      testID="bookmark-btn"
    >
      <Image
        source={require('../../src/assets/images/bookmarkicon.png')}
        style={{ width: 52, height: 36 }}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );

  // 👉 Header Right (Coins + Bookmark)
  const HeaderRight = () => (
    <View style={styles.headerRightContainer}>
      <CoinBadge />
      <BookmarkButton />
    </View>
  );

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: 'white',
          tabBarInactiveTintColor: 'rgb(144, 144, 144)',
          tabBarStyle: {
            position: 'absolute',
            height: 70,
            paddingBottom: 10,
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
            backgroundColor: '#000000',
          },
          tabBarBackground: () => (
            <View style={{ flex: 1, backgroundColor: '#000000' }} />
          ),
          headerStyle: {
            backgroundColor: '#000000',
            borderBottomWidth: 1,
            borderBottomColor: '#262626',
          },
          headerTitleStyle: {
            color: '#e5e7eb',
            fontSize: 24,
            fontWeight: 'bold',
            letterSpacing: 1.2,
          },
          headerTintColor: '#E0B3FF',
          tabBarLabelStyle: {
            fontSize: 14,
          },
        }}
      >
        {/* Home */}
        <Tabs.Screen
          name="index"
          options={{
            headerTitle: () => (
              <Image
                source={require('../../src/assets/images/lg.png')}
                style={{ width: 100, height: 100, resizeMode: 'contain' }}
              />
            ),
            headerRight: () => <HeaderRight />,
            title: 'Home',
            tabBarIcon: ({ focused }) => (
              <Image
                source={
                  focused
                    ? require('../../src/assets/images/home_filled.png')
                    : require('../../src/assets/images/home_unfilled.png')
                }
                style={{
                  width: 24,
                  height: 24,
                  tintColor: focused ? 'white' : 'rgb(144, 144, 144)',
                }}
              />
            ),
          }}
        />

        {/* Leaderboard */}
        <Tabs.Screen
          name="chats"
          options={{
            headerTitle: () => (
              <Image
                source={require('../../src/assets/images/lg.png')}
                style={{ width: 100, height: 100, resizeMode: 'contain' }}
              />
            ),
            title: 'LeaderBoard',
            tabBarIcon: ({ focused }) => (
              <Image
                source={
                  focused
                    ? require('../../src/assets/images/trophy-fill.png')
                    : require('../../src/assets/images/trophy.png')
                }
                style={{
                  width: 24,
                  height: 24,
                  tintColor: focused ? 'white' : 'rgb(144, 144, 144)',
                }}
              />
            ),
          }}
        />

        {/* Practice */}
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Practice',
            headerTitle: () => (
              <Image
                source={require('../../src/assets/images/lg.png')}
                style={{ width: 100, height: 100, resizeMode: 'contain' }}
              />
            ),
            headerRight: () => <HeaderRight />,
            tabBarIcon: ({ focused }) => (
              <Image
                source={
                  focused
                    ? require('../../src/assets/images/book_filled.png')
                    : require('../../src/assets/images/book_unfilled.png')
                }
                style={{
                  width: 24,
                  height: 24,
                  tintColor: focused ? 'white' : 'rgb(144, 144, 144)',
                }}
              />
            ),
          }}
        />

        {/* Settings */}
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Settings',
            headerTitle: () => (
              <Image
                source={require('../../src/assets/images/lg.png')}
                style={{ width: 100, height: 100, resizeMode: 'contain' }}
              />
            ),
            tabBarIcon: ({ focused }) => (
              <Image
                source={
                  focused
                    ? require('../../src/assets/images/set_filled.png')
                    : require('../../src/assets/images/set_unfilled.png')
                }
                style={{
                  width: 24,
                  height: 24,
                  tintColor: focused ? 'white' : 'rgb(144, 144, 144)',
                }}
              />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },

  bookmarkButton: {
    marginLeft: 8,
  },

  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },

  coinIcon: {
    width: 22,
    height: 22,
    marginRight: 6,
  },

  coinText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
