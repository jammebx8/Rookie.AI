import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
  StatusBar,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Responsive helpers (no hardcoded absolute sizes)
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const vw = (percent: number) => Math.round((SCREEN_WIDTH * percent) / 100);
const vh = (percent: number) => Math.round((SCREEN_HEIGHT * percent) / 100);
const scaleFont = (sizePercent: number) => Math.round(SCREEN_WIDTH * sizePercent);

export default function HomeScreen() {
  return (
    <ScrollView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.root}>
        {/* subtle textured background */}
        <Image
          source={require('../src/assets/images/webbackground.jpg')}
          style={styles.bgTexture}
          resizeMode="repeat"
        />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../src/assets/images/meetup_logo-removebg-preview.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.headerCenter}>
            <View style={styles.searchWrap}>
              <TextInput
                placeholder="Search events..."
                placeholderTextColor="#9AA0A6"
                style={styles.searchInput}
                underlineColorAndroid="transparent"
              />
              <View style={styles.locationChip}>
                <Text style={styles.locationText}>Gwalior, IN</Text>
              </View>
              <View style={styles.searchBtn}>
                <Image
                  source={require('../src/assets/images/search_icon.png')}
                  style={styles.searchIcon}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerTextBtn}>
              <Text style={styles.headerText}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerTextBtn}>
              <Text style={styles.headerText}>Log in</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.signUpBtn}>
              <Text style={styles.signUpText}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          {/* Left collage */}
          <View style={styles.sideCollageLeft}>
            <View style={[styles.illWrap, styles.illTop]}>
              <Image
                source={require('../src/assets/images/neutral.png')}
                style={styles.illImg}
                resizeMode="cover"
              />
              <View style={[styles.tagBubble, styles.tagBubblePurple]}>
                <Text style={styles.tagText}>Near you</Text>
              </View>
             
            </View>

            <View style={[styles.illWrap, styles.illBottom]}>
              <Image
                source={require('../src/assets/images/neutral.png')}
                style={styles.illImg}
                resizeMode="cover"
              />
              <View style={[styles.tagBubble, styles.tagBubblePink]}>
                <Text style={styles.tagText}>Dance class</Text>
              </View>
              <Image
                source={require('../src/assets/images/neutral.png')}
                style={[styles.smallDoodle, { left: -vw(1), bottom: -vh(1.2) }]}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Center text block */}
          <View style={styles.centerHero}>
            <Text style={styles.title}>
              <Text>The </Text>
              <Text style={styles.emoji}>👥</Text>
              <Text> people platform.{'\n'}</Text>
              <Text style={styles.titleLine2}>
                Where <Text style={styles.emoji}>⚙️</Text> interests{'\n'}become <Text style={styles.emoji}>💖</Text> friendships.
              </Text>
            </Text>

            <Text style={styles.subtitle}>
              Whatever your interest, from hiking and reading to networking and skill sharing,
              there are thousands of people who share it on Meetup. Events are happening every day—sign up to join the fun.
            </Text>

            <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.9}>
              <LinearGradient
                colors={['#2B2B2B', '#111']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaInner}
              >
                <Text style={styles.ctaText}>Join Meetup</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Right collage */}
          <View style={styles.sideCollageRight}>
            <View style={[styles.illWrapRight, styles.illTopRight]}>
              <Image
                source={require('../src/assets/images/neutral.png')}
                style={styles.illImgRight}
                resizeMode="cover"
              />
              <View style={[styles.tagBubble, styles.tagBubblePinkRight]}>
                <Text style={styles.tagTextDark}>Speaking club</Text>
              </View>
            </View>

            <View style={[styles.illWrapRight, styles.illBottomRight]}>
              <Image
                source={require('../src/assets/images/neutral.png')}
                style={styles.illImgRight}
                resizeMode="cover"
              />
              <View style={[styles.tagBubble, styles.tagBubbleYellow]}>
                <Text style={styles.tagTextDark}>Every Thursday</Text>
              </View>

            
            </View>
          </View>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F6F6F7',
  },
  root: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    width: '100%',
  },

  // background texture fills the screen but keep responsive
  bgTexture: {
    position: 'absolute',
    width: '120%', // slight overflow for repeat
    height: '120%',
    top: -vh(5),
    left: -vw(10),
    opacity: 1,
  },

  /* HEADER */
  header: {
    width: '92%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: vh(2),
    marginBottom: vh(3),
  },
  headerLeft: {
    width: '18%',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: undefined,
    aspectRatio: 4.2,
  },
  headerCenter: {
    width: '56%',
    paddingHorizontal: vw(2),
  },
  searchWrap: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: vw(6),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: vw(2.2),
    paddingVertical: vh(0.8),
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: scaleFont(0.016),
    paddingVertical: 0,
    color: '#222',
    fontWeight: '500',
  },
  locationChip: {
    backgroundColor: '#fff',
    borderRadius: vw(6),
    paddingHorizontal: vw(2),
    paddingVertical: vh(0.4),
    borderWidth: 1,
    borderColor: '#E6E6E6',
    marginRight: vw(2),
  },
  locationText: {
    fontSize: scaleFont(0.014),
    color: '#333',
  },
  searchBtn: {
    width: vw(7),
    height: vw(7),
    borderRadius: vw(7) / 2,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: {
    width: '60%',
    height: '60%',
    tintColor: '#fff',
  },
  headerRight: {
    width: '26%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: vw(2),
  },
  headerTextBtn: {
    marginHorizontal: vw(1),
  },
  headerText: {
    color: '#222',
    fontSize: scaleFont(0.014),
  },
  signUpBtn: {
    backgroundColor: '#111',
    paddingHorizontal: vw(3),
    paddingVertical: vh(0.6),
    borderRadius: vw(6),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: vw(2),
  },
  signUpText: {
    color: '#fff',
    fontSize: scaleFont(0.014),
    fontWeight: '700',
  },

  /* HERO ROW */
  hero: {
    width: '96%',
    minHeight: vh(60),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    marginBottom: vh(4),
  },

  sideCollageLeft: {
    width: '22%',
    alignItems: 'flex-start',
  },
  illWrap: {
    width: '100%',
    aspectRatio: 0.95,
    borderRadius: vw(5),
    overflow: 'visible',
    marginBottom: vh(3),
    position: 'relative',
  },
  illTop: {
    transform: [{ translateY: vh(1) }],
  },
  illBottom: {
    transform: [{ translateY: -vh(1) }],
  },
  illImg: {
    width: '100%',
    height: '100%',
    borderRadius: vw(4),
  },
  tagBubble: {
    position: 'absolute',
    bottom: vh(2.2),
    left: vw(-1),
    paddingVertical: vh(0.5),
    paddingHorizontal: vw(3),
    borderRadius: vw(6),
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tagBubblePurple: {
    backgroundColor: '#CDB7FF',
    transform: [{ rotate: '-6deg' }],
  },
  tagBubblePink: {
    backgroundColor: '#FFB3C9',
    transform: [{ rotate: '-4deg' }],
  },
  tagText: {
    color: '#151515',
    fontWeight: '700',
    fontSize: scaleFont(0.013),
  },
  doodle: {
    position: 'absolute',
    width: vw(14),
    height: vw(14),
    opacity: 0.9,
  },
  smallDoodle: {
    position: 'absolute',
    width: vw(6),
    height: vw(6),
    opacity: 0.95,
  },

  /* Center Hero content */
  centerHero: {
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: vw(2),
    textAlign: 'center',
  },
  title: {
    color: '#111',
    fontSize: scaleFont(0.043),
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: Math.round(scaleFont(0.043) * 1.02),
    marginBottom: vh(2),
  },
  titleLine2: {
    fontSize: scaleFont(0.043),
    fontWeight: '800',
  },
  emoji: {
    fontSize: scaleFont(0.05),
  },
  subtitle: {
    color: '#6B6F75',
    fontSize: scaleFont(0.016),
    textAlign: 'center',
    marginBottom: vh(3),
    lineHeight: Math.round(scaleFont(0.016) * 1.9),
    maxWidth: '95%',
  },
  ctaBtn: {
    borderRadius: vw(8),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 6,
  },
  ctaInner: {
    paddingVertical: vh(1.6),
    paddingHorizontal: vw(8),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: vw(8),
  },
  ctaText: {
    color: '#fff',
    fontSize: scaleFont(0.018),
    fontWeight: '800',
  },

  /* Right collage */
  sideCollageRight: {
    width: '22%',
    alignItems: 'flex-end',
  },
  illWrapRight: {
    width: '100%',
    aspectRatio: 0.95,
    borderRadius: vw(5),
    overflow: 'visible',
    marginBottom: vh(3),
    position: 'relative',
  },
  illTopRight: {
    transform: [{ translateY: -vh(1) }],
  },
  illBottomRight: {
    transform: [{ translateY: vh(1) }],
  },
  illImgRight: {
    width: '100%',
    height: '100%',
    borderRadius: vw(4),
  },
  tagBubblePinkRight: {
    position: 'absolute',
    top: vh(4),
    right: vw(-1),
    backgroundColor: '#FF9AA0',
    paddingHorizontal: vw(3),
    paddingVertical: vh(0.6),
    borderRadius: vw(6),
    transform: [{ rotate: '6deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tagTextDark: {
    color: '#111',
    fontWeight: '700',
    fontSize: scaleFont(0.013),
  },
  tagBubbleYellow: {
    position: 'absolute',
    bottom: vh(2),
    right: vw(-1.2),
    backgroundColor: '#FFE08A',
    paddingHorizontal: vw(3),
    paddingVertical: vh(0.6),
    borderRadius: vw(6),
    transform: [{ rotate: '2deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});