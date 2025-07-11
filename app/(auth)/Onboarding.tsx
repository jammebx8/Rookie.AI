import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ImageBackground,
  StatusBar,
  Linking,
  Platform,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../src/utils/supabase"; // Your existing supabase config

export default function Onboarding() {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        // User is already logged in, navigate to main app
        navigation.reset({
          index: 0,
          routes: [{ name: "(tabs)" }],
        });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        navigation.reset({
          index: 0,
          routes: [{ name: "(tabs)" }],
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Optional: specify scopes
          scopes: 'openid profile email',
          // Optional: redirect to specific URL after auth
          redirectTo: 'com.ttyyy://oauthredirect',
          // Optional: skip email confirmation
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error('OAuth Error:', error);
        Alert.alert('Authentication Error', error.message);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert('Error', 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <ImageBackground
      source={require("../../src/assets/images/bg2.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <Image
          source={require("../../src/assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.heading}>JEE Prep{"\n"}Made Easy</Text>
        <View style={styles.handContainer}>
          <Image
            source={require("../../src/assets/images/Hand.png")}
            style={styles.handImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={[styles.googleButton, loading && styles.buttonDisabled]}
            onPress={signInWithGoogle}
            disabled={loading}
            activeOpacity={0.8}
          >
            <View style={styles.googleButtonContent}>
              <Image
                source={require("../../src/assets/images/Logo-google-icon-PNG.png")}
                style={styles.googleIcon}
              />
              <Text style={styles.googleButtonText}>
                {loading ? 'Signing in...' : 'Continue with Google'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }} />
        <Text style={styles.termsText}>
          By continuing you'll agree to all of our{"\n"}
          <Text
            style={styles.link}
            onPress={() => Linking.openURL("https://yourdomain.com/terms")}
          >
            Terms of service
          </Text>
          {" "} &amp;{" "}
          <Text
            style={styles.link}
            onPress={() => Linking.openURL("https://yourdomain.com/privacy")}
          >
            Privacy policies
          </Text>
          .
        </Text>
      </View>
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
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 60 : 80,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 0,
  },
  logo: {
    width: 100,
    height: 60,
    marginBottom: 10,
  },
  heading: {
    color: "#fff",
    fontSize: 44,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 48,
  },
  handContainer: {
    width: "100%",
    alignItems: "center",
  },
  handImage: {
    width: 500,
    height: 440,
  },
  googleButton: {
    backgroundColor: "#fff",
    borderRadius: 32,
    width: "90%",
    alignSelf: "center",
    marginBottom: 12,
    paddingVertical: 0,
    paddingHorizontal: 0,
    height: 56,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  googleButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
  },
  googleIcon: {
    width: 28,
    height: 28,
    marginRight: 10,
  },
  googleButtonText: {
    color: "#222",
    fontWeight: "bold",
    fontSize: 20,
  },
  termsText: {
    color: "#aaa",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 100,
    marginTop: 2,
    lineHeight: 18,
  },
  link: {
    color: "#3B82F6",
    textDecorationLine: "underline",
  },
});