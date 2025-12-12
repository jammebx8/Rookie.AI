import React from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
  SafeAreaView,
  ScrollView,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const vw = (percent: number) => Math.round((SCREEN_WIDTH * percent) / 100);
const vh = (percent: number) => Math.round((SCREEN_HEIGHT * percent) / 100);

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={Platform.OS === 'android'}
      />

      {/* Header only as requested */}
      <View style={styles.headerOuter}>
        <View style={styles.headerInner}>
          {/* LEFT - Logo */}
          <View style={styles.left}>
            <Image
              source={require('../src/assets/images/meetup_logo-removebg-preview.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* CENTER - Pill search */}
          <View style={styles.center}>
            <View style={styles.pill}>
              <TextInput
                placeholder="Search events..."
                placeholderTextColor="#9AA0A6"
                style={styles.input}
                underlineColorAndroid="transparent"
                returnKeyType="search"
              />

              <View style={styles.divider} />

              <View style={styles.locationWrap}>
                <Text style={styles.locationText}>Gwalior, IN</Text>
                <TouchableOpacity style={styles.xBtn} activeOpacity={0.7}>
                  <Text style={styles.xText}>×</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.searchBtn} activeOpacity={0.85}>
                <Image
                  source={require('../src/assets/images/search_icon.png')}
                  style={styles.searchIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* RIGHT - controls */}
          <View style={styles.right}>
            <TouchableOpacity style={styles.langWrap} activeOpacity={0.8}>
              <Text style={styles.langText}>🌐 English</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginWrap} activeOpacity={0.8}>
              <Text style={styles.loginText}>Log in</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.signupWrap} activeOpacity={0.9}>
              <Text style={styles.signupText}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Minimal page body so header shows in context */}
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderText}>Page content goes here</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F6F6F7',
  },

  headerOuter: {
    width: '100%',
    alignItems: 'center',

    backgroundColor: 'transparent',
  },

  headerInner: {
    width: '92%',
    maxWidth: 1280,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // LEFT
 
  logo: {
    width: 200,
    height: 200,
  
  },

  // CENTER - pill search
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    width: '72%',
    maxWidth: 820,
    height: 56,
    borderRadius: 999,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    // subtle shadow and border to match image
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#eee',
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    color: '#222',
    fontSize: Math.round(SCREEN_WIDTH * 0.014),
    fontWeight: '500',
    marginRight: 8,
  },
  divider: {
    width: 1,
    height: '56%',
    backgroundColor: '#F0F0F2',
    marginHorizontal: 6,
    borderRadius: 1,
  },
  locationWrap: {
    height: '70%',
    minWidth: 120,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  locationText: {
    color: '#4B5560',
    fontSize: Math.round(SCREEN_WIDTH * 0.0132),
    marginRight: 8,
  },
  xBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xText: {
    color: '#9AA0A6',
    fontSize: 16,
    lineHeight: 16,
  },

  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  searchIcon: {
    width: 18,
    height: 18,
    tintColor: '#fff',
  },

  // RIGHT controls row
  right: {
    width: '28%',
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  langWrap: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    marginRight: 8,
  },
  langText: {
    color: '#222',
    fontSize: Math.round(SCREEN_WIDTH * 0.0132),
  },
  loginWrap: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    marginRight: 8,
  },
  loginText: {
    color: '#222',
    fontSize: Math.round(SCREEN_WIDTH * 0.0132),
  },
  signupWrap: {
    backgroundColor: '#111',
    paddingHorizontal: Math.round(SCREEN_WIDTH * 0.038),
    paddingVertical: Math.round(SCREEN_HEIGHT * 0.006),
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: Math.round(SCREEN_WIDTH * 0.0132),
  },

  // body placeholder
  body: {
    paddingTop: vh(4),
    alignItems: 'center',
    paddingBottom: vh(40),
  },
  placeholderCard: {
    width: '92%',
    maxWidth: 1280,
    height: vh(60),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
  },
});