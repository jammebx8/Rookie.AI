import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from "@react-navigation/native";
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser'; // If using Expo
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Dimensions,
} from "react-native";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";
import { supabase } from "../../src/utils/supabase"; // adjust path as needed

WebBrowser.maybeCompleteAuthSession(); // Needed for Expo Auth flows

const GENDER_OPTIONS = ["Male", "Female", "Other"];
const EXAM_OPTIONS = ["Technology", "Sports", "Stand ups", "Politics", "Spiritual", "Concerts", "Self growth", "Health", "Buisness"];

export default function Onboarding() {
  const navigation = useNavigation<any>();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  // Force two-column on wide screens; stack on small screens
  const isTwoColumn = windowWidth >= 900;

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [exam, setExam] = useState("");
  const [inputComplete, setInputComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // local google icon asset (add ../../src/assets/images/google.png to your project)
  const googleIcon = require('../../src/assets/images/googlelogo.png');

  // Helper: when a signed-in user is detected, ensure DB row exists,
  // then if onboarding fields present, persist to AsyncStorage and navigate.
  const handleSignedInUser = async (user: any) => {
    if (!user) return;
    try {
      // Try to read user from users table
      const { data: existingUser, error: selectErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (selectErr) {
        console.warn('Error selecting user from DB', selectErr);
      }

      // If user not present in users table, create a minimal record
      if (!existingUser) {
        const minimal = {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          created_at: new Date().toISOString(),
        };
        const { error: upsertErr } = await supabase.from('users').upsert([minimal]);
        if (upsertErr) {
          console.warn('Error upserting minimal user', upsertErr);
          // still show onboarding if upsert fails
          setFullName(minimal.name);
          setIsAuthenticated(true);
          setAuthLoading(false);
          return;
        }

        // If the Gmail id/email was successfully stored (upsert succeeded), treat the user as onboarded per requirement:
        const toSave = {
          id: minimal.id,
          email: minimal.email,
          name: minimal.name,
          avatar_url: minimal.avatar_url || null,
        };
        try {
          await AsyncStorage.setItem('@user', JSON.stringify(toSave));
          await AsyncStorage.setItem('@user_onboarded', 'true');
          console.log('Saved @user and @user_onboarded after Google sign-in; navigating to homepage');
          setIsAuthenticated(true);
          setAuthLoading(false);
          // Navigate to tabs (reset stack)
          navigation.reset({
            index: 0,
            routes: [{ name: "homepage" }],
          });
          return;
        } catch (storageErr) {
          console.warn('Error saving user onboarded flag locally', storageErr);
          setAuthLoading(false);
          return;
        }
      }

      // If DB row exists and onboarding fields are present, save locally & navigate
      if (existingUser.gender && existingUser.exam) {
        const toSave = {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          gender: existingUser.gender,
          exam: existingUser.exam,
          avatar_url: existingUser.avatar_url || null,
        };
        await AsyncStorage.setItem('@user', JSON.stringify(toSave));
        await AsyncStorage.setItem('@user_onboarded', 'true');
        console.log('Saved @user and @user_onboarded; navigating to homepage');
        setIsAuthenticated(true);
        setAuthLoading(false);
        // Navigate to tabs (reset stack)
        navigation.reset({
          index: 0,
          routes: [{ name: "homepage" }],
        });
        return;
      }

      // Otherwise user exists but onboarding not complete: prefill name and show form
      setFullName(existingUser.name || user.user_metadata?.full_name || '');
      setIsAuthenticated(true);
      setAuthLoading(false);
    } catch (err) {
      console.error('handleSignedInUser error', err);
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    // On mount: check local onboard flag and also check existing Supabase session.
    const init = async () => {
      try {
        const onboarded = await AsyncStorage.getItem('@user_onboarded');
        if (onboarded === 'true') {
          navigation.reset({
            index: 0,
            routes: [{ name: "homepage" }],
          });
          return;
        }
      } catch (e) {
        console.warn('Error reading onboarding flag', e);
      }

      // WEB OAuth redirect handling:
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          const url = window.location.href;
          if (url.includes('access_token') || url.includes('refresh_token') || url.includes('code') || url.includes('provider_token')) {
            console.log('Detected OAuth tokens in URL, calling getSessionFromUrl()');
            const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
            if (error) {
              console.warn('getSessionFromUrl error', error);
            } else if (data?.session?.user) {
              await handleSignedInUser(data.session.user);
              return;
            }
            try {
              const cleanUrl = window.location.origin + window.location.pathname + window.location.search;
              window.history.replaceState({}, document.title, cleanUrl);
            } catch (e) {
              // ignore
            }
          }
        } catch (err) {
          console.warn('Error during getSessionFromUrl flow', err);
        }
      }

      try {
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) {
          console.warn('getSession error', sessionErr);
        }
        const sessionUser = session?.user;
        if (sessionUser) {
          navigation.reset({
            index: 0,
            routes: [{ name: "homepage" }],
          });
          return;
        }
      } catch (err) {
        console.warn('Error checking existing session', err);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state changed:', event, session?.user?.email);
          if (event === 'SIGNED_IN' && session?.user) {
            navigation.reset({
              index: 0,
              routes: [{ name: "homepage" }],
            });
          } else if (event === 'SIGNED_OUT') {
            setIsAuthenticated(false);
            setFullName("");
            setGender("");
            setExam("");
            await AsyncStorage.removeItem('@user');
            await AsyncStorage.removeItem('@user_onboarded');
          }
        }
      );

      return () => subscription?.unsubscribe();
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setInputComplete(fullName.trim().length > 0 && !!gender && !!exam);
  }, [fullName, gender, exam]);

  // === GOOGLE AUTHENTICATION ===
  const signInWithGoogle = async () => {
    try {
      setAuthLoading(true);

      const redirectUrl = isWeb
        ? (typeof window !== 'undefined' ? `${window.location.origin}` : 'https://your-production-url.example')
        : makeRedirectUri({ scheme: 'com.ttyyy', path: '/homepage', useProxy: true });

      console.log('Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error('OAuth error:', error);
        throw error;
      }

      if (!data?.url) {
        throw new Error('No OAuth URL received from Supabase');
      }

      console.log('OAuth URL:', data.url);

      if (isWeb) {
        window.location.href = data.url;
      } else {
        await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      }
    } catch (error: any) {
      console.error('Full error:', error);
      Alert.alert(
        "Authentication Error",
        error?.message || "Google Auth failed. Make sure redirect URL is configured in Supabase."
      );
      setAuthLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!fullName.trim() || !gender || !exam) {
      Alert.alert('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      const user = session?.user;

      if (sessionError) {
        console.warn('Session error', sessionError);
      }

      if (user) {
        const userProfile = {
          id: user.id,
          email: user.email,
          name: fullName.trim(),
          gender,
          exam,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          updated_at: new Date().toISOString(),
        };

        const { error: upsertError } = await supabase.from('users').upsert([userProfile]);
        if (upsertError) {
          console.error('Supabase upsert error:', upsertError);
          Alert.alert("Error", "Failed to save profile to database: " + upsertError.message);
          setLoading(false);
          return;
        }

        await AsyncStorage.setItem('@user', JSON.stringify(userProfile));
        await AsyncStorage.setItem('@user_onboarded', 'true');
        setIsAuthenticated(true);
      } else {
        const userProfile = {
          name: fullName.trim(),
          gender,
          exam,
          created_at: new Date().toISOString(),
        };

        const { data: insertedData, error: insertError } = await supabase
          .from('users')
          .insert([userProfile])
          .select();
        if (insertError) {
          console.error('Supabase insert error:', insertError);
          Alert.alert("Error", "Failed to save profile to database: " + insertError.message);
          setLoading(false);
          return;
        }

        const saved = insertedData?.[0] ? { ...userProfile, id: insertedData[0].id } : userProfile;
        await AsyncStorage.setItem('@user', JSON.stringify(saved));
        await AsyncStorage.setItem('@user_onboarded', 'true');
      }

      navigation.reset({
        index: 0,
        routes: [{ name: "homepage" }],
      });
    } catch (err) {
      console.error('Error saving user data:', err);
      Alert.alert("Error", (err as any)?.message || "Something went wrong saving your data");
    } finally {
      setLoading(false);
    }
  };

  // Illustration asset - add your image to src/assets/images/illustration.png
  // If you don't have one, reuse the background or any other illustration.
  const illustration = require('../../src/assets/images/sign-in.png');

  return (
    <ImageBackground
      source={require("../../src/assets/images/webbackground.jpg")}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingVertical: verticalScale(24) }]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={[styles.container, { flexDirection: isTwoColumn ? 'row' : 'column' }]}>
          {/* Left card */}
          <View style={[styles.leftCard, isTwoColumn ? { marginRight: 28 } : { width: '100%' }]}>
            <Text style={styles.hero}>Hey, There!</Text>
            <Text style={styles.sub}>Let us know you</Text>

            <TouchableOpacity
              style={[styles.googleButton, authLoading && styles.buttonDisabled]}
              onPress={signInWithGoogle}
              disabled={authLoading}
              activeOpacity={authLoading ? 1 : 0.85}
            >
              {authLoading ? (
                <ActivityIndicator size="small" color="#181f2b" />
              ) : (
                <View style={styles.googleContent}>
                  <Image source={googleIcon} style={styles.googleIcon} />
                  <Text style={styles.googleText}>Continue with Google</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.or}>OR</Text>

            <View style={styles.formCard}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your full name"
                placeholderTextColor="#5b6470"
              />

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Gender</Text>
              <View style={styles.rowGroup}>
                {GENDER_OPTIONS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, gender === g && styles.chipSelected]}
                    onPress={() => setGender(g)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.chipText, gender === g && styles.chipTextSelected]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Interests</Text>
              <View style={styles.rowGroup}>
                {EXAM_OPTIONS.map((e) => (
                  <TouchableOpacity
                    key={e}
                    style={[styles.chip, exam === e && styles.chipSelected]}
                    onPress={() => setExam(e)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.chipText, exam === e && styles.chipTextSelected]}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.continueBtn, (!inputComplete || loading) && styles.continueBtnDisabled]}
              onPress={handleContinue}
              disabled={!inputComplete || loading}
              activeOpacity={(!inputComplete || loading) ? 1 : 0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#181f2b" />
              ) : (
                <Text style={[styles.continueText, (!inputComplete) && styles.continueTextInactive]}>
                  {isAuthenticated ? 'Complete Profile' : 'Continue'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.bottomRow}>
              <View style={styles.avatarStack}>
                <Image source={require('../../src/assets/images/avatar1.png')} style={styles.smallAvatar} />
                <Image source={require('../../src/assets/images/avatar2.png')} style={styles.smallAvatar} />
                <Image source={require('../../src/assets/images/avatar3.png')} style={styles.smallAvatar} />
                <Image source={require('../../src/assets/images/avatar4.png')} style={styles.smallAvatar} />
                <View style={styles.plusAvatar}><Text style={styles.plusText}>+129</Text></View>
              </View>
              <Text style={styles.stats}>
                Out of 15,00,000 students{"\n"}
                234+ Student are already practicing with us
              </Text>
            </View>
          </View>

          {/* Right illustration */}
          <View style={[styles.rightCard, isTwoColumn ? {} : { marginTop: 28 }]}>
            <View style={styles.illustrationWrap}>
              <Image
                source={illustration}
                style={styles.illustration}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    minHeight: Dimensions.get('window').height,
    backgroundColor: '#f3f3f3',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: moderateScale(24),
  },
  container: {
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
  },

  // LEFT
  leftCard: {
    backgroundColor: '#000',
    borderRadius: 14,
    padding: moderateScale(22),
    width: '64%',
    minWidth: 420,
    // deep shadow like the image
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 6, height: 8 },
    elevation: 12,
  },
  hero: {
    color: '#fff',
    fontSize: moderateScale(36),
    fontWeight: '900',
    marginBottom: verticalScale(6),
  },
  sub: {
    color: '#c8cbd0',
    fontSize: moderateScale(14),
    marginBottom: verticalScale(14),
  },

  googleButton: {
    backgroundColor: '#fff',
    borderRadius: 999,
    height: verticalScale(46),
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    paddingHorizontal: scale(14),
  },
  googleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    width: scale(18),
    height: scale(18),
    marginRight: scale(10),
    resizeMode: 'contain',
  },
  googleText: {
    color: '#181f2b',
    fontWeight: '700',
    fontSize: moderateScale(15),
  },
  buttonDisabled: {
    opacity: 0.9,
  },

  or: {
    textAlign: 'center',
    color: '#9aa0a9',
    marginVertical: moderateScale(12),
    fontSize: moderateScale(12),
  },

  formCard: {
    backgroundColor: '#07070a',
    borderRadius: 12,
    padding: moderateScale(14),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },

  fieldLabel: {
    color: '#fff',
    fontSize: moderateScale(14),
    marginBottom: verticalScale(8),
    fontWeight: '600',
  },

  input: {
    backgroundColor: '#0b0d11',
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(15),
    borderWidth: 1,
    borderColor: '#1e2730',
    // subtle inner shadow imitation via elevation/shadow on android can be omitted
  },

  rowGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: verticalScale(4),
  },

  chip: {
    backgroundColor: '#181818ff',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#16191d',
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  chipText: {
    color: '#cfd6dc',
    fontWeight: '500',
    fontSize: moderateScale(14),
  },
  chipTextSelected: {
    color: '#081022',
    fontWeight: '700',
  },

  continueBtn: {
    marginTop: verticalScale(18),
    backgroundColor: '#eef0f3',
    borderRadius: 999,
    height: verticalScale(46),
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  continueBtnDisabled: {
    opacity: 0.9,
  },
  continueText: {
    color: '#596272',
    fontSize: moderateScale(16),
    fontWeight: '700',
  },
  continueTextInactive: {
    color: '#7d8591',
  },

  bottomRow: {
    marginTop: verticalScale(18),
    alignItems: 'center',
    width: '100%',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(10),
  },
  smallAvatar: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    marginLeft: -scale(10),
    borderWidth: 2,
    borderColor: '#111217',
    backgroundColor: '#22223f',
  },
  plusAvatar: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: '#651a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -scale(10),
    borderWidth: 2,
    borderColor: '#111217',
  },
  plusText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: moderateScale(12),
  },
  stats: {
    color: '#bfc6cc',
    fontSize: moderateScale(13),
    textAlign: 'center',
    lineHeight: moderateScale(20),
  },

  // RIGHT
  rightCard: {
    width: '52%',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 420,
    paddingLeft: moderateScale(18),
  },
  illustrationWrap: {
    width: '100%',
    maxWidth: 560,
    height: 520,
    alignItems: 'center',
    justifyContent: 'center',
    // keep illustration visually on the right side with whitespace as in image
  },
  illustration: {
    width: '100%',
    height: '100%',
  },

  // responsive tweaks
  '@media (max-width: 900px)': {

    rightCard: {
      width: '100%',
      paddingLeft: 0,
    },
  },
});