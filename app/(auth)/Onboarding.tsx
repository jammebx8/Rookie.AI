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
  const { width: windowWidth } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isNarrow = windowWidth < 900; // break at ~900px

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [exam, setExam] = useState("");
  const [inputComplete, setInputComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
        contentContainerStyle={[
          styles.scrollContent,
          isWeb && !isNarrow ? styles.scrollContentWeb : null
        ]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={[
          styles.innerWrapper,
          isWeb && !isNarrow ? styles.innerWrapperWeb : null
        ]}>
          {/* Left column: form and controls */}
          <View style={[
            styles.leftPanel,
            isWeb && !isNarrow ? styles.leftPanelWeb : null
          ]}>
            <Text style={styles.title}>Hey, kiddo!</Text>
            <Text style={styles.subtitle}>Let us know you</Text>

            <TouchableOpacity
              style={[styles.continueButton, authLoading && styles.continueButtonInactive, styles.googleBtn]}
              onPress={signInWithGoogle}
              disabled={authLoading}
              activeOpacity={authLoading ? 1 : 0.8}
            >
              {authLoading ? (
                <ActivityIndicator size="small" color="#181f2b" />
              ) : (
                <Text style={styles.continueButtonText}>
                  Continue with Google
                </Text>
              )}
            </TouchableOpacity>

            <Text style={styles.orText}>OR</Text>

            <View style={styles.infoBox}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your full name"
                placeholderTextColor="#888"
              />

              <Text style={styles.label}>Gender</Text>
              <View style={styles.buttonGroup}>
                {GENDER_OPTIONS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.selectButton,
                      gender === g && styles.selectedButton,
                    ]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={[
                      styles.selectButtonText,
                      gender === g && styles.selectedButtonText
                    ]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Interests</Text>
              <View style={styles.buttonGroup}>
                {EXAM_OPTIONS.map((e) => (
                  <TouchableOpacity
                    key={e}
                    style={[
                      styles.selectButton,
                      exam === e && styles.selectedButton,
                    ]}
                    onPress={() => setExam(e)}
                  >
                    <Text style={[
                      styles.selectButtonText,
                      exam === e && styles.selectedButtonText
                    ]}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.continueButton,
                (!inputComplete || loading) && styles.continueButtonInactive,
              ]}
              onPress={handleContinue}
              disabled={!inputComplete || loading}
              activeOpacity={inputComplete && !loading ? 0.8 : 1}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#181f2b" />
              ) : (
                <Text style={[
                  styles.continueButtonText,
                  !inputComplete && styles.continueButtonTextInactive
                ]}>
                  {isAuthenticated ? 'Complete Profile' : 'Continue'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.bottomSection}>
              <View style={styles.avatarRow}>
                <Image source={require('../../src/assets/images/avatar1.png')} style={styles.avatar} />
                <Image source={require('../../src/assets/images/avatar2.png')} style={styles.avatar} />
                <Image source={require('../../src/assets/images/avatar3.png')} style={styles.avatar} />
                <Image source={require('../../src/assets/images/avatar4.png')} style={styles.avatar} />
                <View style={styles.avatarPlus}>
                  <Text style={styles.avatarPlusText}>+129</Text>
                </View>
              </View>
              <Text style={styles.studentStats}>
                Out of 15,00,000 students{"\n"}
                234+ Student are already practicing with us
              </Text>
            </View>
          </View>

          {/* Right column: semi-transparent illustration for web / hidden on narrow screens */}
          {!isNarrow ? (
            <View style={[styles.rightPanel, isWeb ? styles.rightPanelWeb : null]}>
              <View style={styles.illustrationContainer}>
                <Image
                  source={illustration}
                  style={styles.illustration}
                  resizeMode="contain"
                />
                {/* subtle overlay to make illustration slightly transparent */}
                <View style={styles.illustrationOverlay} pointerEvents="none" />
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

// ...styles kept similar but extended for web two-column layout...
const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    minHeight: Dimensions.get('window').height,
    
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: verticalScale(32),
  },
  scrollContentWeb: {
    paddingVertical: verticalScale(48),
  },
  innerWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  innerWrapperWeb: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    paddingHorizontal: moderateScale(40),
  },
  leftPanel: {
    width: "90%",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: Platform.OS === "android" ? verticalScale(30) : verticalScale(40),
  },
  leftPanelWeb: {
    width: "48%",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingVertical: moderateScale(30),
    paddingRight: moderateScale(40),
    backgroundColor: '#000', // subtle glass panel
    borderRadius: moderateScale(16),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    boxShadow: '0px 10px 30px rgba(0,0,0,0.5)' as any, // for web; ignored on native
    overflow: 'hidden',
  },
  rightPanel: {
    width: "90%",
    marginTop: verticalScale(20),
    alignItems: "center",
    justifyContent: "center",
  },
  rightPanelWeb: {
    width: "48%",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: moderateScale(30),
    paddingVertical: moderateScale(20),
  },
  illustrationContainer: {
    width: "100%",
    height: 520,
    alignItems: "center",
    justifyContent: "center",
    position: 'relative',
  },
  illustration: {
    width: "110%",
    height: "110%",
    opacity: 1, // makes the illustration transparent as requested
    transform: [{ translateX: 10 }],
  },
  illustrationOverlay: {
    position: 'absolute',
    left: 0, top: 0, right: 0, bottom: 0,
    backgroundColor: 'transparent',
  },
  title: {
    color: "#fff",
    fontWeight: "bold",
    fontFamily: 'Geist',
    fontSize: moderateScale(36),
    marginBottom: verticalScale(6),
    alignSelf: "flex-start",
  },
  subtitle: {
    color: "#d2d2e0",
    fontSize: moderateScale(17),
    fontFamily: 'Geist',
    marginBottom: verticalScale(12),
    alignSelf: "flex-start",
  },
  infoBox: {
    backgroundColor: "rgba(3,6,15,0.6)",
    borderRadius: moderateScale(14),
    padding: moderateScale(20),
    width: "100%",
    marginBottom: verticalScale(18),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    alignSelf: "center",
  },
  label: {
    color: "#fff",
    fontSize: moderateScale(15),
    fontFamily: 'Geist',
    fontWeight: "500",
    marginBottom: verticalScale(6),
    marginTop: verticalScale(10),
  },
  input: {
    backgroundColor: "#0C111D",
    borderRadius: moderateScale(10),
    color: "#fff",
    fontFamily: 'Geist',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    fontSize: moderateScale(16),
    marginBottom: verticalScale(8),
    borderWidth: 1,
    borderColor: "#344054",
  },
  buttonGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: verticalScale(8),
    marginTop: verticalScale(4),
  },
  selectButton: {
    backgroundColor: "#0C111D",
    borderRadius: moderateScale(18),
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(8),
    marginRight: scale(10),
    marginBottom: verticalScale(8),
    borderWidth: 1,
    borderColor: "#262626",
    fontFamily: 'Geist',
  },
  selectedButton: {
    backgroundColor: "#fff",
    borderColor: "#344054",
  },
  selectButtonText: {
    color: "#fff",
    fontSize: moderateScale(15),
    fontWeight: "500",
    fontFamily: 'Geist',
  },
  selectedButtonText: {
    color: "#181f2b",
    fontWeight: "bold",
    fontFamily: 'Geist',
  },
  continueButton: {
    width: "100%",
    height: verticalScale(38),
    borderRadius: moderateScale(27),
 
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginTop: verticalScale(18),
    marginBottom: verticalScale(8),
    shadowColor: "#000",
    shadowOpacity: 0.10,
    shadowRadius: moderateScale(8),
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  googleBtn: {
    marginTop: 0,
  },
  continueButtonInactive: {
    backgroundColor: "#F2F4F7",
  },
  continueButtonText: {
    color: "#181f2b",
    fontWeight: "bold",
    fontSize: moderateScale(17),
    fontFamily: 'Geist',
  },
  continueButtonTextInactive: {
    color: "#667085",
    fontFamily: 'Geist',
  },
  orText: {
    color: "#b5b6c9",
    marginVertical: moderateScale(8),
    fontFamily: 'Geist',
    fontSize: moderateScale(13),
    alignSelf: 'center',
  },
  bottomSection: {
    alignItems: "center",
    marginTop: verticalScale(16),
    width: "100%",
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(8),
  },
  avatar: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    marginLeft: -scale(10),
    borderWidth: 2,
    borderColor: "#22223f",
    backgroundColor: "#22223f",
  },
  avatarPlus: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: "#651a1a",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -scale(10),
    borderWidth: 2,
    borderColor: "#22223f",
  },
  avatarPlusText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: moderateScale(15),
    fontFamily: 'Geist',
  },
  studentStats: {
    color: "#fff",
    fontSize: moderateScale(14),
    textAlign: "center",
    marginTop: verticalScale(2),
    marginBottom: verticalScale(30),
    lineHeight: moderateScale(20),
    fontFamily: 'Geist',
  },
});