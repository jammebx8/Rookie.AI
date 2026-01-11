import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  Platform,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from "@react-navigation/native";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";

/**
 * ✅ PAYMENT-GATEWAY COMPLIANT TERMS & POLICIES
 * Razorpay / PhonePe safe
 */
const simpleTermsContent = `
Terms and Conditions

1. Introduction
Welcome to OurApp, an educational platform designed to help students practice questions, receive AI-powered guidance, motivation, and track their progress through leaderboards.
By accessing or using our services, you agree to be bound by these Terms and Conditions.

2. Service Description
OurApp provides:
- Practice questions for students
- AI-generated explanations, solutions, and motivational feedback
- Performance tracking and leaderboards for comparison

All services provided are skill-based and intended strictly for educational purposes.

3. Privacy Policy
We respect your privacy and are committed to protecting your personal data.

- We collect basic information such as name, email, and usage data to improve the learning experience.
- Payment information is securely processed by trusted third-party payment gateways (such as Razorpay or PhonePe).
- We do not store or have access to your card, UPI, or banking details.
- We do not sell, rent, or trade user data to third parties.
- Data may be shared only when required by law or for payment processing purposes.

4. Digital Delivery Policy
- All services are delivered digitally through the app or to the registered email address.
- No physical goods are shipped.

5. Cancellation and Refund Policy
- Users may request cancellation within 24 hours of purchase, provided premium features or services have not been substantially used.
- Approved refunds will be processed to the original payment method within 5–7 business days.
- Refund requests must be submitted via email with valid transaction details.

6. Contact Us
For questions, support, or refund requests, please contact us at:
Email: dhruvgdscp@gmail.com

7. Acceptance of Terms
By continuing to use OurApp or completing a payment, you confirm that you have read, understood, and agreed to these Terms and Policies.
`;

export default function TermsAgree() {
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    const checkOnboarded = async () => {
      const onboarded = await AsyncStorage.getItem('@user_onboarded');
      if (onboarded === 'true') {
        router.replace("/edith");
      }
    };
    checkOnboarded();
  }, []);
  
  const handleContinue = async () => {
    router.push("/Onboarding");
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
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }} />

          <Text style={styles.termsText}>
            By continuing you'll agree to all of our{"\n"}
            <Text style={styles.link} onPress={() => setModalVisible(true)}>
              Terms & Conditions
            </Text>
            .
          </Text>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              <Text style={styles.modalTitle}>Policies and Terms</Text>
              <Text style={styles.modalText}>{simpleTermsContent}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    backgroundColor: "#000",
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? verticalScale(60) : verticalScale(80),
    alignItems: "center",
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
    height: verticalScale(48),
    justifyContent: "center",
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: "#222",
    fontWeight: "bold",
    fontSize: moderateScale(20),
    textAlign: "center",
    fontFamily: 'Geist',
  },
  termsText: {
    color: "#aaa",
    fontSize: moderateScale(13),
    textAlign: "center",
    marginBottom: verticalScale(100),
    lineHeight: moderateScale(18),
    fontFamily: 'Geist',
  },
  link: {
    color: "#3B82F6",
    textDecorationLine: "underline",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    padding: 16,
  },
  modalView: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontWeight: "bold",
    fontSize: moderateScale(20),
    marginBottom: 12,
    textAlign: "center",
  },
  modalText: {
    fontSize: moderateScale(14),
    color: "#333",
    lineHeight: moderateScale(18),
    marginBottom: 28,
    fontFamily: 'Geist',
  },
  closeButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 28,
    alignSelf: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: moderateScale(15),
  },
});
