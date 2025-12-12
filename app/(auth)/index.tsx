import { View, Text, StyleSheet, Image, StatusBar, ImageBackground } from 'react-native';
import React, { useEffect, useState } from 'react';
import { router, useNavigation } from 'expo-router';
import imagepath from '../../src/constants/imagepath';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../src/utils/supabase';

const Auth = () => {
  const [isloading, setIsLoading] = useState(false);
  const gifDisplayTime = 3000; // time before routing (ms)

  let navigate_to_terms = () => {
    router.push('/Onboarding');
  };

  const navigation = useNavigation();

  // Keep the same splash timing behavior, but no GIF in the footer.
  let loading_timeout = () => {
    setIsLoading(true);
    setTimeout(navigate_to_terms, gifDisplayTime);
  };

  useEffect(() => {
    let subscription: any;

    const init = async () => {
      try {
        // 1) If there is already a Supabase session, go to Onboarding to let it finish processing
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Let Onboarding handle DB rows / AsyncStorage / final redirect to (tabs)
          router.replace('/Onboarding');
          return;
        }
      } catch (err) {
        console.warn('Error checking supabase session on splash:', err);
      }

      try {
        // 2) If local onboard flag already set, go straight to (tabs)
        const onboarded = await AsyncStorage.getItem('@user_onboarded');
        if (onboarded === 'true') {
          navigation.reset({
            index: 0,
            routes: [{ name: "(tabs)" }],
          });
          return;
        }
      } catch (err) {
        console.warn('Error reading @user_onboarded in splash:', err);
      }

      // 3) No session and not onboarded: show splash (background + centered logo) then push to terms_agree
      loading_timeout();
    };

    init();

    // Listen for auth state changes while splash is visible.
    // This catches the SIGNED_IN event from a redirect flow and prevents the app from routing to terms_agree prematurely.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // send to Onboarding which contains flow to upsert user and navigate to (tabs) if ready
        router.replace('/Onboarding');
      }
    });
    subscription = data?.subscription;

    return () => {
      subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Background image - replace this require with your actual background asset path if different.
  // The user provided two images; place them in the project at:
  // ../../src/assets/images/bg_texture.png  (the background)
  // and use imagepath.homelogo (existing) or ../../src/assets/images/event_edge_logo.png for the centered logo.
  const backgroundImage = require('../../src/assets/images/webbackground.jpg');
  const homelogo = require('../../src/assets/images/meetup_logo-removebg-preview.png');
  return (
    
      <SafeAreaView style={style.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* Header left intentionally empty to keep focus on centered entry point */}
        <View style={style.header} />

        {/* Main: centered logo and optional title - this is the entry point */}
        <View style={style.body}>
          <Image
            source={imagepath.homelogo}
            style={style.logo_style}
            resizeMode="contain"
          />
         
          <Text style={style.tagline}>Gwalior events. Always ahead.</Text>
        </View>

        {/* Footer: simple attribution / entry helpers - GIF removed as requested */}
        <View style={style.footer}>
          <Text style={style.from_text}>From</Text>
          <Text style={style.pookie_text}>Innovators</Text>
        </View>
      </SafeAreaView>
 
  );
};

const style = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    height: 40,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom:110
  },
  footer: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  from_text: {
    fontSize: 16,
    color: '#000',
  },
  pookie_text: {
    color: '#000',
    paddingTop: 6,
    fontSize: 16,
    fontWeight: '700',
  },
  logo_style: {
    width: 420,
    height: 420,
    marginBottom: 15,
   
  },

  tagline: {
    color: '#000',
    fontSize: 20,
    marginTop: 4,
    fontWeight:'600'
  },
});

export default Auth;