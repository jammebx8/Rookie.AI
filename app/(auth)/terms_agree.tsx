import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ImageBackground,
  StatusBar,
  Platform,
  Linking,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from "@react-navigation/native";

export default function TermsAgree() {
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    // If onboarding is already done, redirect to (tabs)
    const checkOnboarded = async () => {
      const onboarded = await AsyncStorage.getItem('@user_onboarded');
      if (onboarded === 'true') {
        navigation.reset({
          index: 0,
          routes: [{ name: "(tabs)" }],
        });
      }
    };
    checkOnboarded();
  }, []);

  const handleContinue = async () => {
    // Go to Onboarding page
    navigation.reset({
      index: 0,
      routes: [{ name: "Onboarding" }],
    });
  };

  return (
    <ImageBackground
      source={require("../../src/assets/images/bg2.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
        <Image
          source={require("../../src/assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.heading}>Your Prep{"\n"}Made Easy</Text>
        <View style={styles.handContainer}>
          <Image
            source={require("../../src/assets/images/Hand.png")}
            style={styles.handImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={[styles.continueButton, loading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>
              Continue
            </Text>
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
      fontFamily: 'Geist',
  },
  handContainer: {
    width: "100%",
    alignItems: "center",
  },
  handImage: {
    width: 500,
    height: 440,
  },
  continueButton: {
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
  continueButtonText: {
    color: "#222",
    fontWeight: "bold",
      fontFamily: 'Geist',
    fontSize: 20,
    textAlign: "center",
  },
  termsText: {
    color: "#aaa",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 100,
    marginTop: 2,
    lineHeight: 18,
      fontFamily: 'Geist',
  },
  link: {
    color: "#3B82F6",
    textDecorationLine: "underline",
  },
});

