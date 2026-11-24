// main.dart
// Rookie.AI Flutter app entry point

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/dropper_theme.dart';
import 'features/home/home_screen.dart';
import 'features/question_viewer/question_viewer_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Lock to portrait
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Status bar style
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
  ));

  // NOTE: Replace kSupabaseUrl and kSupabaseAnonKey in core/supabase_client.dart
  // with actual values from NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
  // before running. initSupabase() is commented out until credentials are set.
  // await initSupabase();

  runApp(const RookieApp());
}

class RookieApp extends StatelessWidget {
  const RookieApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Rookie.AI',
      debugShowCheckedModeBanner: false,
      theme:     dropperTheme(dark: false),
      darkTheme: dropperTheme(dark: true),
      themeMode: ThemeMode.system,

      // ── Routes ───────────────────────────────────────────────────────────
      initialRoute: '/',
      onGenerateRoute: (settings) {
        switch (settings.name) {

          case '/':
            return MaterialPageRoute(
              builder: (_) => const HomeScreen(),
              settings: settings,
            );

          case '/question-viewer':
            final args = settings.arguments as Map<String, dynamic>? ?? {};
            return MaterialPageRoute(
              builder: (_) => QuestionViewerScreen(
                subject:    args['subject']    as String? ?? '',
                chapter:    args['chapter']    as String? ?? '',
                examName:   args['examName']   as String? ?? 'JEE Main',
                startQid:   args['qid']        as String?,
                startIndex: args['startIndex'] as int? ?? 0,
                isDaily:    args['mode']       == 'daily',
              ),
              settings: settings,
            );

          default:
            return MaterialPageRoute(
              builder: (_) => const HomeScreen(),
            );
        }
      },
    );
  }
}
