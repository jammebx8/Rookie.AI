import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from "@react-navigation/native";
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
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
} from "react-native";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";
import { supabase } from "../../src/utils/supabase";

WebBrowser.maybeCompleteAuthSession();

const GENDER_OPTIONS = ["Male", "Female", "Other"];
const EXAM_OPTIONS = ["JEE Mains", "NEET", "JEE Advanced", "Other"];

export default function Onboarding() {
  const navigation = useNavigation();
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [exam, setExam] = useState("");
  const [inputComplete, setInputComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const googleIcon = require('../../src/assets/images/googlelogo.png');

  // Check if user is already onboarded on mount
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const onboarded = await AsyncStorage.getItem('@user_onboarded');
        if (onboarded === 'true') {
          navigation.reset({
            index: 0,
            routes: [{ name: "(tabs)" }],
          });
          return;
        }
      } catch (e) {
        console.warn('Error reading onboarding flag', e);
      }

      // Handle OAuth redirect on web
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          const url = window.location.href;
          if (url.includes('access_token') || url.includes('refresh_token') || url.includes('code')) {
            console.log('Detected OAuth tokens in URL');
            const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
            
            if (error) {
              console.warn('getSessionFromUrl error', error);
            } else if (data?.session?.user) {
              await handleGoogleSignIn(data.session.user);
            }
            
            // Clean URL
            try {
              const cleanUrl = window.location.origin + window.location.pathname;
              window.history.replaceState({}, document.title, cleanUrl);
            } catch (e) {
              console.warn('Error cleaning URL', e);
            }
          }
        } catch (err) {
          console.warn('Error during OAuth redirect handling', err);
        }
      }

      // Check for existing session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await handleGoogleSignIn(session.user);
        }
      } catch (err) {
        console.warn('Error checking existing session', err);
      }

      // Listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state changed:', event);
          if (event === 'SIGNED_IN' && session?.user) {
            await handleGoogleSignIn(session.user);
          } else if (event === 'SIGNED_OUT') {
            await AsyncStorage.removeItem('@user');
            await AsyncStorage.removeItem('@user_onboarded');
          }
        }
      );

      return () => subscription?.unsubscribe();
    };

    checkOnboarding();
  }, []);

  // Update input completion status
  useEffect(() => {
    setInputComplete(fullName.trim().length > 0 && !!gender && !!exam);
  }, [fullName, gender, exam]);

  // Handle Google Sign-In: Save Gmail ID to AsyncStorage and navigate
  const handleGoogleSignIn = async (user: any) => {
    try {
      setAuthLoading(true);

      // Save Gmail ID and user info to Supabase users table
      const userProfile = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        created_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from('users')
        .upsert([userProfile], { onConflict: 'id' });

      if (upsertError) {
        console.warn('Error saving to Supabase:', upsertError);
      }

      // Save Gmail ID to AsyncStorage
      const localData = {
        id: user.id,
        email: user.email,
        name: userProfile.name,
        avatar_url: userProfile.avatar_url,
      };

      await AsyncStorage.setItem('@user', JSON.stringify(localData));
      await AsyncStorage.setItem('@user_onboarded', 'true');

      console.log('Google sign-in successful, Gmail ID saved locally');

      // Navigate to tabs
      navigation.reset({
        index: 0,
        routes: [{ name: "(tabs)" }],
      });
    } catch (err) {
      console.error('Error handling Google sign-in:', err);
      Alert.alert("Error", "Failed to complete Google sign-in");
    } finally {
      setAuthLoading(false);
    }
  };

  // Google Sign-In button handler
  const signInWithGoogle = async () => {
    try {
      setAuthLoading(true);

      const redirectUrl = Platform.OS === 'web'
        ? (typeof window !== 'undefined' ? `${window.location.origin}` : 'https://rookie-ai.vercel.app')
        : makeRedirectUri({ scheme: 'com.ttyyy', path: '/(tabs)', useProxy: true });

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

      if (Platform.OS === 'web') {
        window.location.href = data.url;
      } else {
        await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      Alert.alert(
        "Authentication Error",
        error?.message || "Google authentication failed"
      );
      setAuthLoading(false);
    }
  };

  // Manual Continue: Save name, gender, exam to Supabase and AsyncStorage
  const handleContinue = async () => {
    if (!fullName.trim() || !gender || !exam) {
      Alert.alert('Incomplete', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      // Create user profile with manual data
      const userProfile = {
        name: fullName.trim(),
        gender,
        exam,
        created_at: new Date().toISOString(),
      };

      // Save to Supabase
      const { data: insertedData, error: insertError } = await supabase
        .from('users')
        .insert([userProfile])
        .select();

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        Alert.alert("Error", "Failed to save profile: " + insertError.message);
        setLoading(false);
        return;
      }

      // Save to AsyncStorage (name, gender, exam only)
      const localData = {
      
        name: fullName.trim(),
        gender,
        exam,
      };

      await AsyncStorage.setItem('@user', JSON.stringify(localData));
      await AsyncStorage.setItem('@user_onboarded', 'true');

      console.log('Manual sign-up successful, user data saved');

      // Navigate to tabs
      navigation.reset({
        index: 0,
        routes: [{ name: "(tabs)" }],
      });
    } catch (err) {
      console.error('Error saving user data:', err);
      Alert.alert("Error", (err as any)?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../../src/assets/images/bg2.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Hey, kiddo!</Text>
          <Text style={styles.subtitle}>Let's us know you</Text>

          <TouchableOpacity
            style={[styles.continueButton, authLoading && styles.continueButtonInactive]}
            onPress={signInWithGoogle}
            disabled={authLoading}
            activeOpacity={authLoading ? 1 : 0.8}
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

          <Text style={{
            color: "#b5b6c9",
            marginVertical: moderateScale(8),
            fontFamily: 'Geist',
            fontSize: moderateScale(13),
          }}>
            OR
          </Text>

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
            <Text style={styles.label}>Preparing for</Text>
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
                Continue
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
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? verticalScale(60) : verticalScale(80),
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 0,
  },
  title: {
    color: "#fff",
    fontWeight: "bold",
    fontFamily: 'Geist',
    fontSize: moderateScale(32),
    marginTop: verticalScale(12),
    marginBottom: verticalScale(4),
    alignSelf: "flex-start",
    marginLeft: scale(25),
  },
  subtitle: {
    color: "#d2d2e0",
    fontSize: moderateScale(17),
    fontFamily: 'Geist',
    marginBottom: verticalScale(12),
    alignSelf: "flex-start",
    marginLeft: scale(25),
  },
  infoBox: {
    backgroundColor: "#000000",
    borderRadius: moderateScale(18),
    padding: moderateScale(24),
    width: "90%",
    marginBottom: verticalScale(18),
    borderWidth: 1,
    borderColor: "#1D2939",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(6),
    elevation: 3,
  },
  label: {
    color: "#fff",
    fontSize: moderateScale(16),
    fontFamily: 'Geist',
    fontWeight: "500",
    marginBottom: verticalScale(6),
    marginTop: verticalScale(14),
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
    gap: scale(10),
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
    width: "90%",
    height: verticalScale(48),
    borderRadius: moderateScale(27),
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginTop: verticalScale(18),
    marginBottom: verticalScale(8),
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.10,
    shadowRadius: moderateScale(8),
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  continueButtonInactive: {
    backgroundColor: "#F2F4F7",
  },
  continueButtonText: {
    color: "#181f2b",
    fontWeight: "bold",
    fontSize: moderateScale(19),
    fontFamily: 'Geist',
  },
  continueButtonTextInactive: {
    color: "#667085",
    fontFamily: 'Geist',
  },
  bottomSection: {
    alignItems: "center",
    marginTop: verticalScale(16),
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
    fontSize: moderateScale(15),
    textAlign: "center",
    marginTop: verticalScale(2),
    marginBottom: verticalScale(40),
    lineHeight: moderateScale(20),
    fontFamily: 'Geist',
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
});