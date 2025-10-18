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
  ScrollView,
} from "react-native";
import { router } from "expo-router";

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from "@react-navigation/native";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";

export default function TermsAgree() {
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    const checkOnboarded = async () => {
      const onboarded = await AsyncStorage.getItem('@user_onboarded');
      if (onboarded === 'true') {
        router.replace("/edith"); // replaces stack so user can’t go back
      }
    };
    checkOnboarded();
  }, []);
  
  const handleContinue = async () => {
    router.push("/Onboarding"); // or router.replace("/edith") if you don’t want back navigation
  };
  

 

  return (
  <> 
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.container}>
          <Image
            source={require("../../src/assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.heading}>Give your child{"\n"}a better you</Text>
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
      </ScrollView>
      </>
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
    backgroundColor: "#000",
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? verticalScale(60) : verticalScale(80),
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 0,
  },
  logo: {
    width: scale(100),
    height: verticalScale(60),
    marginBottom: verticalScale(10),
  },
  heading: {
    color: "#fff",
    fontSize: moderateScale(44),
    fontWeight: "bold",
    textAlign: "center",
    marginTop: verticalScale(10),
    lineHeight: moderateScale(48),
    fontFamily: 'Geist',
  },
  handContainer: {
    width: "100%",
    alignItems: "center",
  },
  handImage: {
    width: scale(300),
    height: verticalScale(265),
  },
  continueButton: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(32),
    width: "90%",
    alignSelf: "center",
    marginBottom: verticalScale(12),
    paddingVertical: 0,
    paddingHorizontal: 0,
    height: verticalScale(48),
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: moderateScale(8),
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
    fontSize: moderateScale(20),
    textAlign: "center",
  },
  termsText: {
    color: "#aaa",
    fontSize: moderateScale(13),
    textAlign: "center",
    marginBottom: verticalScale(100),
    marginTop: verticalScale(2),
    lineHeight: moderateScale(18),
    fontFamily: 'Geist',
  },
  link: {
    color: "#3B82F6",
    textDecorationLine: "underline",
  },
});