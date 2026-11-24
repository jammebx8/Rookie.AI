// supabase_client.dart
// Supabase initialization and shared client
// Uses same project as the web app

import 'package:supabase_flutter/supabase_flutter.dart';

const kSupabaseUrl = 'https://rzcizwacjexolkjjczbt.supabase.co';
const kSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6Y2l6d2FjamV4b2xrampjemJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MTA2ODMsImV4cCI6MjA2MDk4NjY4M30.I5TO7lLOuBwe6T5wllcx3FK_is0pammMtVw-oevfTws';
// NOTE: replace with actual values from NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

Future<void> initSupabase() async {
  await Supabase.initialize(
    url: kSupabaseUrl,
    anonKey: kSupabaseAnonKey, // ignore: deprecated_member_use
  );
}

SupabaseClient get supabase => Supabase.instance.client;
