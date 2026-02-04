'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

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

export default function TermsAgreePage() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    try {
      const onboarded = typeof window !== 'undefined' ? window.localStorage.getItem('@user_onboarded') : null;
      if (onboarded === 'true') {
        router.replace('/auth/onboarding');
      }
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinue = () => {
    router.push('/auth/onboarding');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black text-white">
      <div className="max-w-lg w-full text-center">
      <Image src="/logo.png" alt="logo" width={100} height={60} className="mx-auto" />
        <h1 className="text-4xl font-bold mt-6">Your Prep<br />Made Easy</h1>

        <div className="mt-6 flex flex-col items-center">
          <Image src="/Hand.png" alt="hand" width={300} height={265} />
          <button onClick={handleContinue} className="mt-6 w-full bg-white text-black py-3 rounded-2xl font-bold">Continue</button>
        </div>

        <p className="text-gray-400 mt-8">By continuing you'll agree to all of our <br /><button onClick={() => setModalVisible(true)} className="text-blue-400 underline">Terms & Conditions</button>.</p>
      </div>

      {modalVisible && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-xl p-6 max-h-[80vh] overflow-auto w-full max-w-3xl">
            <h2 className="text-center font-bold text-lg">Policies and Terms</h2>
            <pre className="text-sm text-slate-800 whitespace-pre-wrap mt-4">{simpleTermsContent}</pre>
            <div className="mt-6 flex justify-center"><button onClick={() => setModalVisible(false)} className="bg-blue-500 text-white px-6 py-2 rounded-lg">Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}