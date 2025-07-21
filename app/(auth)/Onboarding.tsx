import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  ImageBackground,
  StatusBar,
  Platform,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from "@react-navigation/native";

const GENDER_OPTIONS = ["Male", "Female", "Other"];
const EXAM_OPTIONS = ["JEE mains", "JEE Advanced", "NEET", "Other"];

export default function Onboarding() {
  const navigation = useNavigation();
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [exam, setExam] = useState("");
  const [inputComplete, setInputComplete] = useState(false);

  useEffect(() => {
    // Check if user is already onboarded
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

  useEffect(() => {
    setInputComplete(fullName.trim().length > 0 && !!gender && !!exam);
  }, [fullName, gender, exam]);

  const handleContinue = async () => {
    await AsyncStorage.setItem('@user', JSON.stringify({
      name: fullName.trim(),
      gender,
      exam,
    }));
    await AsyncStorage.setItem('@user_onboarded', 'true');
    navigation.reset({
      index: 0,
      routes: [{ name: "(tabs)" }],
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
        <Text style={styles.title}>Hey, kiddo!</Text>
        <Text style={styles.subtitle}>Let’s us know you</Text>
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
            !inputComplete && styles.continueButtonInactive,
          ]}
          onPress={handleContinue}
          disabled={!inputComplete}
          activeOpacity={inputComplete ? 0.8 : 1}
        >
          <Text style={[
            styles.continueButtonText,
            !inputComplete && styles.continueButtonTextInactive
          ]}>
            Continue 
          </Text>
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
  title: {
    color: "#fff",
    fontWeight: "bold",
      fontFamily: 'Geist',
    fontSize: 32,
    marginTop: 12,
    marginBottom: 4,
    alignSelf: "flex-start",
    marginLeft: 25,
  },
  subtitle: {
    color: "#d2d2e0",
    fontSize: 17,
      fontFamily: 'Geist',
    marginBottom: 12,
    alignSelf: "flex-start",
    marginLeft: 25,
  },
  infoBox: {
    backgroundColor: "#000000",
   
    borderRadius: 18,
    padding: 24,
    width: "90%",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#1D2939",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  label: {
    color: "#fff",
    fontSize: 16,
      fontFamily: 'Geist',
    fontWeight: "500",
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: "#0C111D",
    borderRadius: 10,
    color: "#fff",
      fontFamily: 'Geist',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#344054",
  },
  buttonGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
    marginTop: 4,
  },
  selectButton: {
    backgroundColor: "#0C111D",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginRight: 10,
    marginBottom: 8,
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
    fontSize: 15,
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
    height: 54,
    borderRadius: 27,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 8,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.10,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  continueButtonInactive: {
    backgroundColor: "#F2F4F7",
  },
  continueButtonText: {
    color: "#181f2b",
    fontWeight: "bold",
    fontSize: 19,
      fontFamily: 'Geist',
  },
  continueButtonTextInactive: {
    color: "#667085",
      fontFamily: 'Geist',
  },
  bottomSection: {
    alignItems: "center",
    marginTop: 16,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginLeft: -10,
    borderWidth: 2,
    borderColor: "#22223f",
    backgroundColor: "#22223f",
  },
  avatarPlus: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#651a1a",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -10,
    borderWidth: 2,
    borderColor: "#22223f",
  },
  avatarPlusText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
      fontFamily: 'Geist',
  },
  studentStats: {
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
    marginTop: 2,
    marginBottom: 40,
    lineHeight: 20,
      fontFamily: 'Geist',
  },
});