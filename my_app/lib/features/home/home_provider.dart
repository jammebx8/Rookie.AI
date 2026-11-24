// home_provider.dart
// State + data for the Home screen
// Mirrors page.tsx + hooks.ts logic

import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/constants.dart';
import '../../core/models.dart';
import '../../core/supabase_client.dart';

class HomeProvider extends ChangeNotifier {
  RookieUser? user;
  StreakData streak = const StreakData();
  int solvedToday = 0;
  int? dailyGoal;
  int rookieCoins = 0;
  bool loadingUser = true;
  bool loadingStreak = true;
  int motivationIndex = 0;
  String selectedBuddyId = kDefaultBuddyId;

  // For the recommended question card
  Question? recommendedQuestion;
  bool loadingRecommended = true;
  String? recommendedError;
  String? recSelectedOption;
  bool? recIsCorrect;

  HomeProvider() {
    _init();
  }

  Future<void> _init() async {
    final prefs = await SharedPreferences.getInstance();
    // Motivation index — changes daily
    motivationIndex = DateTime.now().day % kMotivations.length;

    // Selected buddy
    selectedBuddyId = prefs.getString(kSelectedBuddy) ?? kDefaultBuddyId;

    // Daily goal
    dailyGoal = prefs.getInt(kDailyGoalKey);

    // Solved today
    final todayKey = 'questionsToday_${DateTime.now().toLocal().toString().substring(0, 10)}';
    final stamped = prefs.getInt('qToday_${DateTime.now().toLocal().toString().substring(0, 10)}') ?? 0;
    solvedToday = prefs.getInt(todayKey) ?? stamped;

    // Streak
    final raw = prefs.getString(kStreakKey);
    if (raw != null) {
      try { streak = StreakData.fromJson(jsonDecode(raw)); } catch (_) {}
    }
    loadingStreak = false;

    // User from Supabase auth
    _loadUser(prefs);
    // Recommended question
    _loadRecommendedQuestion();
  }

  Future<void> _loadUser(SharedPreferences prefs) async {
    try {
      final raw = prefs.getString(kUserKey);
      if (raw != null) {
        user = RookieUser.fromJson(jsonDecode(raw));
        loadingUser = false;
        notifyListeners();
      }

      final authUser = supabase.auth.currentUser;
      if (authUser == null) {
        loadingUser = false;
        notifyListeners();
        return;
      }

      final res = await supabase
          .from('users')
          .select()
          .eq('id', authUser.id)
          .maybeSingle();

      if (res != null) {
        final row = Map<String, dynamic>.from(res as Map);
        final u = RookieUser.fromJson({
          ...row,
          'email': authUser.email,
        });
        user = u;
        await prefs.setString(kUserKey, jsonEncode(u.toJson()));
      }

      // Sync daily count with DB
      await _syncDailyCount(authUser.id, prefs);
    } catch (e) {
      debugPrint('HomeProvider._loadUser: $e');
    } finally {
      loadingUser = false;
      notifyListeners();
    }
  }

  Future<void> _syncDailyCount(String userId, SharedPreferences prefs) async {
    try {
      final todayStart = DateTime.now().toLocal();
      final dayStart = DateTime(todayStart.year, todayStart.month, todayStart.day);

      final res = await supabase
          .from('attempts')
          .select('question_id')
          .eq('student_id', userId)
          .gte('created_at', dayStart.toIso8601String());

      final dbCount = (res as List).length;
      final todayKey = 'questionsToday_${dayStart.toString().substring(0, 10)}';
      final local = prefs.getInt(todayKey) ?? 0;
      final highest = max(local, dbCount);
      solvedToday = highest;
      await prefs.setInt(todayKey, highest);
      notifyListeners();
    } catch (_) {}
  }

  Future<void> _loadRecommendedQuestion() async {
    try {
      final authUser = supabase.auth.currentUser;
      if (authUser == null) {
        loadingRecommended = false;
        notifyListeners();
        return;
      }

      // Pick subject based on hour (simple rotation; real app uses recommendation engine)
      final subjects = ['physics', 'chemistry', 'maths'];
      final subject = subjects[DateTime.now().hour % 3];

      final res = await supabase
          .from(kDbTableMain)
          .select()
          .eq('subject', subject)
          .not('correct_option', 'is', null)
          .not('question_text', 'is', null)
          .limit(50);

      final rows = res as List<dynamic>;
      if (rows.isEmpty) {
        recommendedError = 'No questions found';
        loadingRecommended = false;
        notifyListeners();
        return;
      }

      // Pick a random one not recently answered
      final r = Random();
      final row = rows[r.nextInt(rows.length)] as Map<String, dynamic>;
      recommendedQuestion = Question.fromJson(row);
    } catch (e) {
      recommendedError = e.toString();
      debugPrint('_loadRecommendedQuestion: $e');
    } finally {
      loadingRecommended = false;
      notifyListeners();
    }
  }

  void handleRecommendedAnswer(String optKey) async {
    if (recSelectedOption != null || recommendedQuestion == null) return;
    recSelectedOption = optKey;

    final q = recommendedQuestion!;
    final norm = (String? v) =>
        (v ?? '').replaceAll(RegExp(r'option_?', caseSensitive: false), '')
            .replaceAll(RegExp(r'[^a-dA-D]'), '').substring(0, 1 < (v?.length ?? 0) ? 1 : 0).toLowerCase();

    recIsCorrect = norm(optKey) == norm(q.correctOption);
    notifyListeners();

    // Log attempt
    try {
      final authUser = supabase.auth.currentUser;
      if (authUser != null) {
        await supabase.from('attempts').insert({
          'student_id': authUser.id,
          'question_id': q.questionId,
          'correct': recIsCorrect,
          'time_taken_sec': 0,
        });
      }
    } catch (_) {}
  }

  void setDailyGoal(int goal) async {
    dailyGoal = goal;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(kDailyGoalKey, goal);
  }

  void setSelectedBuddy(String id) async {
    selectedBuddyId = id;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(kSelectedBuddy, id);
  }

  double get goalPct {
    if (dailyGoal == null || dailyGoal == 0) return 0;
    return (solvedToday / dailyGoal! * 100).clamp(0, 100);
  }

  String get greeting {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  String get motivationalLine => kMotivations[motivationIndex % kMotivations.length];

  AiBuddy get currentBuddy => kAiBuddies[selectedBuddyId] ?? kAiBuddies[kDefaultBuddyId]!;
}
