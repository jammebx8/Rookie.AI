import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Fontisto from '@expo/vector-icons/Fontisto';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Platform, View, Dimensions, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
const { width } = Dimensions.get('window');
import { Image } from 'react-native';
import { StatusBar } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TabLayout() {
  const router = useRouter();

  // Bookmark button component
  const BookmarkButton = () => (
    <TouchableOpacity
      style={styles.bookmarkButton}
      onPress={() => router.push('/BookmarkScreen')}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      testID="bookmark-btn"
    >
      {/* You can use Image below if you want to use the provided image asset.
          Replace the require path with your local asset if needed. */}
      {/* 
      <Image
        source={require('../../src/assets/images/bookmark_button.png')}
        style={{ width: 48, height: 32 }}
        resizeMode="contain"
      />
      */}
      <View style={styles.bookmarkIconContainer}>
        {/* SVG path or use Feather Icon for a "bookmark" lookalike */}
        <Feather name="bookmark" size={28} color="#fff" />
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0a0517" />
      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: 'white',
          tabBarInactiveTintColor: 'rgb(144, 144, 144)',
          tabBarStyle: {
            position: 'absolute',
            height: 60,
            paddingBottom: 10,
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
          },
          tabBarBackground: () => (
            <LinearGradient
              colors={['rgba(11,11,40,0.95)', 'rgba(0,0,0,0.95)']}
              style={{
                flex: 1,
              }}
            />
          ),
          headerStyle: {
            backgroundColor: '#0a0517',
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
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            headerTitle: () => (
              <Image
                source={require('../../src/assets/images/lg.png')}
                style={{
                  width: 100,
                  height: 100,
                  resizeMode: 'contain',
                }}
              />
            ),
            headerRight: () => <BookmarkButton />,
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Image
                source={require('../../src/assets/images/home_14424222.png')}
                style={{
                  width: 24,
                  height: 24,
                  tintColor: focused ? 'white' : 'rgb(144, 144, 144)',
                }}
                resizeMode="contain"
              />
            ),
          }}
        />

        <Tabs.Screen
          name="chats"
          options={{
            headerTitle: () => (
              <Image
                source={require('../../src/assets/images/lg.png')}
                style={{
                  width: 100,
                  height: 100,
                  resizeMode: 'contain',
                }}
              />
            ),
            title: 'Chats',
            tabBarIcon: ({ color, focused }) => (
              <Image
                source={require('../../src/assets/images/chat-circle-text.png')}
                style={{
                  width: 24,
                  height: 24,
                  tintColor: focused ? 'white' : 'rgb(144, 144, 144)',
                }}
                resizeMode="contain"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Practice',
            tabBarIcon: ({ color, size, focused }) => (
              <Image
                source={require('../../src/assets/images/book.png')}
                style={{
                  width: 24,
                  height: 24,
                  tintColor: focused ? 'white' : 'rgb(144, 144, 144)',
                }}
                resizeMode="contain"
              />
            ),
            headerTitle: () => (
              <Image
                source={require('../../src/assets/images/lg.png')}
                style={{
                  width: 100,
                  height: 100,
                  resizeMode: 'contain',
                }}
              />
            ),
            headerRight: () => <BookmarkButton />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size, focused }) => (
              <Image
                source={require('../../src/assets/images/set.png')}
                style={{
                  width: 24,
                  height: 24,
                  tintColor: focused ? 'white' : 'rgb(144, 144, 144)',
                }}
                resizeMode="contain"
              />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  bookmarkButton: {
    marginRight: 16,
  },
  bookmarkIconContainer: {
    backgroundColor: '#171e2e', // matches your image bg
    borderRadius: 20,
    width: 68,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#232b39',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
});