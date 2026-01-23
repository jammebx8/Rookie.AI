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

const Class_OPTIONS = ["12th", "11th", "Dropper","Other"];
const EXAM_OPTIONS = ["JEE Mains", "NEET", "JEE Advanced", "Other"];

export default function Onboarding() {
  const navigation = useNavigation();
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [exam, setExam] = useState("");
  const [inputComplete, setInputComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [profileNeedsCompletion, setProfileNeedsCompletion] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const googleIcon = require('../../src/assets/images/googlelogo.png');

  /* ----------------------------------------------------
  1. CHECK SESSION ON APP LOAD
---------------------------------------------------- */
useEffect(() => {
 const initAuth = async () => {
   try {
     // 1️⃣ Fast path → local cache
     const cachedUser = await AsyncStorage.getItem('@user');
     if (cachedUser) {
       const parsed = JSON.parse(cachedUser);
       // If cached user already has gender & exam, we can skip onboarding
       if (parsed?.gender && parsed?.exam) {
         navigation.reset({
           index: 0,
           routes: [{ name: "(tabs)" }],
         });
       } else {
         // If cached user is missing required fields, set the "needs completion" flag
         // so Home (index.tsx) shows the modal and we still navigate to tabs.
         const needsPayload = {
           id: parsed?.id,
           email: parsed?.email,
           name: parsed?.name,
           avatar_url: parsed?.avatar_url,
           gender: parsed?.gender || null,
           exam: parsed?.exam || null,
         };
         await AsyncStorage.setItem('@needs_profile_completion', JSON.stringify(needsPayload));
         navigation.reset({
           index: 0,
           routes: [{ name: "(tabs)" }],
         });
       }
     }

     // 2️⃣ Source of truth → Supabase
     const { data: { session } } = await supabase.auth.getSession();

     if (session?.user) {
       await upsertAndRedirect(session.user);
     }
   } catch (err) {
     console.warn("Auth init error:", err);
   }
 };

 initAuth();

 const { data: { subscription } } =
   supabase.auth.onAuthStateChange(async (event, session) => {
     if (event === "SIGNED_IN" && session?.user) {
       await upsertAndRedirect(session.user);
     }

     if (event === "SIGNED_OUT") {
       await AsyncStorage.removeItem('@user');
     }
   });

 return () => subscription?.unsubscribe();
}, []);

/* ----------------------------------------------------
  2. UPSERT USER & REDIRECT
---------------------------------------------------- */
const upsertAndRedirect = async (user: any) => {
 try {
   setAuthLoading(true);

   const profile = {
     id: user.id,
     email: user.email,
     name:
       user.user_metadata?.full_name ||
       user.user_metadata?.name ||
       user.email,
     avatar_url:
       user.user_metadata?.avatar_url ||
       user.user_metadata?.picture ||
       null,
     created_at: new Date().toISOString(),
     
   };

   // ✅ Upsert user (no blocking fields)
   const { data, error } = await supabase
     .from("users")
     .upsert(profile, { onConflict: "id" })
     .select()
     .single();

   if (error) {
     console.error("Upsert error:", error);
     return;
   }

   // ✅ Cache locally (NOT source of truth)
   await AsyncStorage.setItem("@user", JSON.stringify(data));

   // If the DB row is missing gender or exam, mark that we need profile completion.
   if (!data?.gender || !data?.exam) {
     const needsPayload = {
       id: data.id,
       email: data.email,
       name: data.name,
       avatar_url: data.avatar_url,
       gender: data.gender || null,
       exam: data.exam || null,
     };
     await AsyncStorage.setItem('@needs_profile_completion', JSON.stringify(needsPayload));
     // Redirect to main app — index.tsx will show the completion modal.
     navigation.reset({
       index: 0,
       routes: [{ name: "(tabs)" }],
     });
     return;
   }

   // ✅ Redirect (profile is complete)
   navigation.reset({
     index: 0,
     routes: [{ name: "(tabs)" }],
   });
 } catch (err) {
   console.error("Auth flow error:", err);
   Alert.alert("Error", "Login failed");
 } finally {
   setAuthLoading(false);
 }
};

/* ----------------------------------------------------
  3. GOOGLE SIGN-IN
---------------------------------------------------- */
const signInWithGoogle = async () => {
 try {
   setAuthLoading(true);

   const redirectUrl =
     Platform.OS === "web"
       ? window.location.origin
       : makeRedirectUri({
           scheme: "com.ttyyy",
           useProxy: true,
         });

   const { data, error } = await supabase.auth.signInWithOAuth({
     provider: "google",
     options: { redirectTo: redirectUrl },
   });

   if (error) throw error;

   if (Platform.OS !== "web") {
     await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
   }
 } catch (err: any) {
   console.error("Google sign-in error:", err);
   Alert.alert("Authentication Error", err.message);
   setAuthLoading(false);
 }
};

/* ----------------------------------------------------
  4. SAVE PROFILE COMPLETION (INLINE OPTION)
  This supports the inline completion UI in this screen.
  It will also update Supabase and local storage and clear the needs flag.
---------------------------------------------------- */
const saveProfileCompletion = async () => {
  try {
    if (!fullName.trim() && !gender && !exam) {
      Alert.alert('Incomplete', 'Please provide required fields');
      return;
    }

    setLoading(true);

    // Ensure we have a user id: try session if currentUserId not set
    let userId = currentUserId;
    if (!userId) {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        console.warn('Failed to get session user:', userErr);
      }
      userId = user?.id ?? null;
      if (!userId) {
        // Fallback: try reading @needs_profile_completion
        const rawNeeds = await AsyncStorage.getItem('@needs_profile_completion');
        if (rawNeeds) {
          const needs = JSON.parse(rawNeeds);
          userId = needs?.id || null;
        }
      }
    }

    if (!userId) {
      Alert.alert('Error', 'Unable to determine user id. Please sign in again.');
      setLoading(false);
      return;
    }

    const payload: any = {
      id: userId,
      gender,
      exam,
    };

    if (fullName && fullName.trim().length > 0) payload.name = fullName.trim();
    if (currentAvatar) payload.avatar_url = currentAvatar;

    const { error: upsertError } = await supabase
      .from('users')
      .upsert([payload], { onConflict: 'id' });

    if (upsertError) {
      console.error('Supabase upsert error (inline completion):', upsertError);
      Alert.alert('Error', 'Failed to save profile: ' + upsertError.message);
      setLoading(false);
      return;
    }

    // Fetch final user row
    const { data: finalRow, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    const finalLocal = {
      id: userId,
      email: finalRow?.email || currentEmail,
      name: fullName?.trim() || finalRow?.name || '',
      avatar_url: currentAvatar || finalRow?.avatar_url || null,
      gender: gender,
      exam: exam,
      rookieCoinsEarned: finalRow?.rookieCoinsEarned ?? 0,
    };

    // Save locally and clear the needs flag
    await AsyncStorage.setItem('@user', JSON.stringify(finalLocal));
    await AsyncStorage.setItem('@user_onboarded', 'true');
    await AsyncStorage.removeItem('@needs_profile_completion');

    // Navigate into app
    navigation.reset({
      index: 0,
      routes: [{ name: "(tabs)" }],
    });
  } catch (err) {
    console.error('Error saving profile completion (inline):', err);
    Alert.alert('Error', (err as any)?.message || 'Something went wrong');
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

          {/* If profileNeedsCompletion is true we show the completion inputs inline */}
          {profileNeedsCompletion ? (
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
                {Class_OPTIONS.map((g) => (
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

              <TouchableOpacity
                style={[styles.continueButton, (!fullName.trim() || !gender || !exam) && styles.continueButtonInactive]}
                onPress={saveProfileCompletion}
                disabled={loading}
                activeOpacity={loading ? 1 : 0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#181f2b" />
                ) : (
                  <Text style={styles.continueButtonText}>Save & Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            // If profile completion not required, show the Google sign-in CTA (optionally keep the manual fields visible if you want)
            <>
              <View style={styles.infoBox}>
                <Text style={styles.label}>Full Name (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Your full name"
                  placeholderTextColor="#888"
                />
                <Text style={styles.label}>Class (optional)</Text>
                <View style={styles.buttonGroup}>
                  {Class_OPTIONS.map((g) => (
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
                <Text style={styles.label}>Preparing for (optional)</Text>
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
            </>
          )}

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