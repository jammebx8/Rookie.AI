import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { supabase } from '../src/utils/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the current session (Supabase will parse the hash/query params)
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          router.replace('/(auth)');
          return;
        }

        if (session?.user) {
          const user = session.user;

          // Save to AsyncStorage
          await AsyncStorage.setItem(
            '@user',
            JSON.stringify({
              email: user.email,
              name: user.user_metadata?.full_name || '',
              avatar_url: user.user_metadata?.avatar_url || '',
            })
          );

          // Save to Supabase users table
          await supabase.from('users').upsert([
            {
              id: user.id,
              email: user.email,
              name: user.user_metadata?.full_name || '',
            },
          ]);

          await AsyncStorage.setItem('@user_onboarded', 'true');

          // Navigate to tabs
          router.replace('/(tabs)');
        } else {
          // No session, go back to onboarding
          router.replace('/(auth)');
        }
      } catch (err) {
        console.error('Error in auth callback:', err);
        router.replace('/(auth)');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <ActivityIndicator size="large" color="#fff" />
      <Text style={{ color: '#fff', marginTop: 16 }}>Completing sign-in...</Text>
    </View>
  );
}
