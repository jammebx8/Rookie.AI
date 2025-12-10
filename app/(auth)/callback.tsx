import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../src/utils/supabase';

/**
 * This component handles the OAuth callback redirect from Supabase.
 * It retrieves the session, stores user data, and redirects to the appropriate screen.
 */
export default function AuthCallback() {
  const navigation = useNavigation();
  const route = useRoute();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setLoading(true);

        // Give Supabase a moment to process the session
        await new Promise(resolve => setTimeout(resolve, 500));

        // Get the current session (Supabase should have set it after OAuth)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(`Session error: ${sessionError.message}`);
        }

        if (!session?.user) {
          setError('No session found. Authentication may have failed.');
          console.error('No session found after OAuth callback');
          return;
        }

        const user = session.user;
        const userEmail = user.email;
        const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
        const avatarUrl = user.user_metadata?.avatar_url || '';

        console.log('Auth callback - User authenticated:', userEmail);

        // Check if user has a profile in the users table
        const { data: existingUser, error: selectError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (selectError && selectError.code !== 'PGRST116') {
          // PGRST116 is "no rows found" which is expected for new users
          throw new Error(`Database error: ${selectError.message}`);
        }

        if (existingUser) {
          // User already has profile, redirect to tabs
          await AsyncStorage.setItem('@user_onboarded', 'true');
          await AsyncStorage.setItem('@user', JSON.stringify({
            id: user.id,
            email: userEmail,
            name: existingUser.name,
            gender: existingUser.gender,
            exam: existingUser.exam,
            avatar_url: existingUser.avatar_url || avatarUrl,
          }));

          navigation.reset({
            index: 0,
            routes: [{ name: '(tabs)' }],
          });
        } else {
          // New user, redirect to onboarding with pre-filled name
          await AsyncStorage.setItem('@temp_user_email', userEmail);
          await AsyncStorage.setItem('@temp_user_name', userName);
          await AsyncStorage.setItem('@temp_avatar_url', avatarUrl);

          console.log('New user - redirecting to onboarding');

          // Navigate to onboarding to complete profile
          navigation.reset({
            index: 0,
            routes: [{ name: '(auth)', params: { screen: 'Onboarding' } }],
          });
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred during authentication');
        // Reset navigation after showing error
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: '(auth)', params: { screen: 'index' } }],
          });
        }, 3000);
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigation, route]);

  return (
    <View style={styles.container}>
      {loading ? (
        <>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.text}>Completing authentication...</Text>
        </>
      ) : error ? (
        <>
          <Text style={styles.errorText}>Authentication Error</Text>
          <Text style={styles.text}>{error}</Text>
          <Text style={styles.text}>Redirecting...</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
    marginTop: 20,
    fontSize: 16,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});
