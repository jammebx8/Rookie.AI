// question_viewer_provider.dart
// All state + logic for the question viewer screen
// Mirrors QuestionViewerClient.tsx exactly

import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import '../../core/constants.dart';
import '../../core/models.dart';
import '../../core/supabase_client.dart';

enum SolutionStatus { idle, loading, done, restricted, error }
enum AnswerStatus  { unanswered, pending, answered }

class QuestionViewerProvider extends ChangeNotifier {
  // ── Config ────────────────────────────────────────────────────────────────
  final String subject;
  final String chapter;
  final String examName;
  final String? startQid;
  final int    startIndex;
  final bool   isDaily;

  String get dbTable => examName == 'JEE Advanced' ? kDbTableAdv : kDbTableMain;

  QuestionViewerProvider({
    required this.subject,
    required this.chapter,
    this.examName = 'JEE Main',
    this.startQid,
    this.startIndex = 0,
    this.isDaily = false,
  }) {
    _init();
  }

  // ── Questions ─────────────────────────────────────────────────────────────
  List<Question> questions = [];
  int totalCount = 0;
  int currentIndex = 0;
  int globalIndex = 0;
  bool loadingQuestions = true;
  bool loadingMore = false;

  static const int _pageSize = 20;
  int _pageOffset = 0;
  bool _hasMore = true;

  // ── Per-question state ────────────────────────────────────────────────────
  String? selectedOption;
  String? pendingOption;
  String? resolvedCorrectOption;
  bool?   isCorrect;
  String  solution = '';
  String? aiFollowup;
  SolutionStatus solutionStatus = SolutionStatus.idle;
  bool   aiFollowupLoading = false;
  bool   bookmarked = false;
  String integerAnswer = '';
  int    timer = 0;
  int    rookieCoins = 0;

  // ── Pass / daily limit ────────────────────────────────────────────────────
  bool?  hasPass;          // null = checking
  int    attemptsToday = 0;
  bool   isCurrentRestricted = false;
  bool   showPassModal = false;

  // ── Buddy ─────────────────────────────────────────────────────────────────
  String buddyId         = kDefaultBuddyId;
  String solutionBuddyId = kDefaultBuddyId;

  // ── Misc ─────────────────────────────────────────────────────────────────
  String? userId;
  final _answeredThisSession = <String>{};
  DateTime _questionStartTime = DateTime.now();
  final _dio = Dio();

  // ─────────────────────────────────────────────────────────────────────────
  Future<void> _init() async {
    final prefs = await SharedPreferences.getInstance();
    buddyId = prefs.getString(kSelectedBuddy) ?? kDefaultBuddyId;
    solutionBuddyId = buddyId;

    // Attempts today
    final todayKey = _todayKey();
    attemptsToday = prefs.getInt(todayKey) ?? 0;

    // Auth
    final authUser = supabase.auth.currentUser;
    userId = authUser?.id;

    // Pass check
    _checkPass();

    // Load questions
    await _loadQuestions();

    // Sync attempts with DB
    if (userId != null) _syncAttempts(userId!);
  }

  String _todayKey() {
    final d = DateTime.now().toLocal();
    return 'questionsToday_${d.year}-${d.month}-${d.day}';
  }

  Future<void> _syncAttempts(String uid) async {
    try {
      final dayStart = DateTime.now().toLocal();
      final start = DateTime(dayStart.year, dayStart.month, dayStart.day);
      final res = await supabase
          .from('attempts')
          .select('question_id')
          .eq('student_id', uid)
          .gte('created_at', start.toIso8601String());
      final dbCount = (res as List).length;
      final prefs = await SharedPreferences.getInstance();
      final local = prefs.getInt(_todayKey()) ?? 0;
      attemptsToday = max(local, dbCount);
      await prefs.setInt(_todayKey(), attemptsToday);
      notifyListeners();
    } catch (_) {}
  }

  Future<void> _checkPass() async {
    try {
      if (userId == null) { hasPass = false; notifyListeners(); return; }
      final res = await supabase
          .from('users')
          .select('rookie_pass_active, rookie_pass_expires_at')
          .eq('id', userId!)
          .maybeSingle();
      if (res == null) { hasPass = false; }
      else {
        final active = res['rookie_pass_active'] as bool? ?? false;
        final exp = res['rookie_pass_expires_at'] as String?;
        if (!active) { hasPass = false; }
        else if (exp == null) { hasPass = true; }
        else { hasPass = DateTime.parse(exp).isAfter(DateTime.now()); }
      }
    } catch (_) { hasPass = false; }
    notifyListeners();
  }

  // ─── Load questions ───────────────────────────────────────────────────────
  Future<void> _loadQuestions() async {
    loadingQuestions = true;
    notifyListeners();
    try {
      var query = supabase
          .from(dbTable)
          .select()
          .not('question_text', 'is', null)
          .not('correct_option', 'is', null);

      if (subject.isNotEmpty) query = query.eq('subject', subject.toLowerCase());
      if (chapter.isNotEmpty) query = query.eq('chapter', chapter);

      final count = await supabase
          .from(dbTable)
          .select('question_id')
          .eq('subject', subject.toLowerCase());
      totalCount = (count as List).length;

      final rows = await query
          .order('question_id')
          .range(_pageOffset, _pageOffset + _pageSize - 1);

      questions = (rows as List).map((r) => Question.fromJson(r as Map<String, dynamic>)).toList();
      currentIndex = startIndex.clamp(0, max(0, questions.length - 1));
      globalIndex  = startIndex;

      _pageOffset += _pageSize;
      _hasMore = questions.length >= _pageSize;

      _restoreSession(globalIndex);
      _syncBookmark();
    } catch (e) {
      debugPrint('_loadQuestions: $e');
    } finally {
      loadingQuestions = false;
      notifyListeners();
    }
  }

  Future<void> loadMoreIfNeeded() async {
    if (loadingMore || !_hasMore) return;
    if (currentIndex < questions.length - 5) return;
    loadingMore = true;
    notifyListeners();
    try {
      var query = supabase
          .from(dbTable)
          .select()
          .not('question_text', 'is', null)
          .not('correct_option', 'is', null);
      if (subject.isNotEmpty) query = query.eq('subject', subject.toLowerCase());
      if (chapter.isNotEmpty) query = query.eq('chapter', chapter);
      final rows = await query
          .order('question_id')
          .range(_pageOffset, _pageOffset + _pageSize - 1);
      final more = (rows as List).map((r) => Question.fromJson(r as Map<String, dynamic>)).toList();
      questions = [...questions, ...more];
      _pageOffset += _pageSize;
      _hasMore = more.length >= _pageSize;
    } catch (_) {}
    loadingMore = false;
    notifyListeners();
  }

  // ─── Session save / restore ───────────────────────────────────────────────
  static const _sessionCap = 100;

  Map<String, dynamic>? _loadSession(int idx) {
    try {
      final raw = _prefs == null ? null : _prefs!.getString(kSessionKey);
      if (raw == null) return null;
      final map = jsonDecode(raw) as Map<String, dynamic>;
      return map[idx.toString()] as Map<String, dynamic>?;
    } catch (_) { return null; }
  }

  SharedPreferences? _prefs;

  Future<void> _ensurePrefs() async {
    _prefs ??= await SharedPreferences.getInstance();
  }

  void _saveSession(Map<String, dynamic> data) async {
    await _ensurePrefs();
    try {
      final raw = _prefs!.getString(kSessionKey);
      final map = raw != null ? (jsonDecode(raw) as Map<String, dynamic>) : <String, dynamic>{};
      map[globalIndex.toString()] = data;
      if (map.length > _sessionCap) {
        final keys = map.keys.toList()..sort((a, b) => int.parse(a).compareTo(int.parse(b)));
        for (final k in keys.take(map.length - _sessionCap)) map.remove(k);
      }
      await _prefs!.setString(kSessionKey, jsonEncode(map));
    } catch (_) {}
  }

  void _restoreSession(int idx) {
    final saved = _loadSession(idx);
    if (saved == null) return;
    selectedOption      = saved['selectedOption'] as String?;
    isCorrect           = saved['isCorrect'] as bool?;
    solution            = saved['solution'] as String? ?? '';
    solutionBuddyId     = saved['solutionBuddyId'] as String? ?? buddyId;
    isCurrentRestricted = saved['isRestricted'] as bool? ?? false;
    if (selectedOption != null) {
      resolvedCorrectOption = questions[currentIndex].correctOption;
    }
    if (saved['solutionRequested'] == true) {
      solutionStatus = isCurrentRestricted ? SolutionStatus.restricted : SolutionStatus.done;
    }
  }

  void _syncBookmark() async {
    final q = currentQuestion;
    if (q == null) return;
    await _ensurePrefs();
    try {
      final raw = _prefs!.getString(kBookmarksKey);
      final arr = raw != null ? jsonDecode(raw) as List : [];
      bookmarked = arr.any((b) => (b as Map)['question_id'] == q.questionId);
      notifyListeners();
    } catch (_) {}
  }

  // ─── Navigation ───────────────────────────────────────────────────────────
  void goTo(int delta) {
    final newLocal  = currentIndex + delta;
    final newGlobal = globalIndex  + delta;
    if (newLocal < 0 || newGlobal < 0) return;
    if (newLocal >= questions.length && newGlobal >= totalCount) return;

    currentIndex = newLocal;
    globalIndex  = newGlobal;
    _reset();
    _restoreSession(globalIndex);
    _syncBookmark();
    loadMoreIfNeeded();
    notifyListeners();
  }

  void _reset() {
    selectedOption      = null;
    pendingOption       = null;
    resolvedCorrectOption = null;
    isCorrect           = null;
    solution            = '';
    aiFollowup          = null;
    solutionStatus      = SolutionStatus.idle;
    isCurrentRestricted = false;
    integerAnswer       = '';
    timer               = 0;
    _questionStartTime  = DateTime.now();
  }

  Question? get currentQuestion =>
      questions.isNotEmpty && currentIndex < questions.length ? questions[currentIndex] : null;

  // ─── Answer handling ──────────────────────────────────────────────────────
  Future<void> handleOptionClick(String opt) async {
    if (selectedOption != null || pendingOption != null) return;
    final q = currentQuestion; if (q == null) return;

    pendingOption = opt;
    notifyListeners();

    final timeSpent = DateTime.now().difference(_questionStartTime).inSeconds;
    final isNewSolve = !_answeredThisSession.contains(q.questionId);

    if (isNewSolve) {
      _answeredThisSession.add(q.questionId);
      attemptsToday += 1;
      await _ensurePrefs();
      await _prefs!.setInt(_todayKey(), attemptsToday);
    }

    final isUserPaid = hasPass == true;
    final isRestricted = !isUserPaid && (isNewSolve ? attemptsToday - 1 : attemptsToday) >= kFreeDailyLimit;

    final ans = q.correctOption;
    final correct = _normalize(opt) == _normalize(ans);

    isCorrect           = correct;
    selectedOption      = opt;
    pendingOption       = null;
    resolvedCorrectOption = ans;
    _questionStartTime  = DateTime.now();

    if (isRestricted) {
      isCurrentRestricted = true;
      solutionStatus = SolutionStatus.restricted;
      showPassModal = true;
      _postAnswerMeta(correct, timeSpent, q);
      _saveSession({
        'selectedOption': opt, 'isCorrect': correct,
        'solution': '', 'solutionRequested': true,
        'solutionBuddyId': buddyId, 'isRestricted': true,
      });
      notifyListeners();
      return;
    }

    isCurrentRestricted = false;
    solutionStatus = SolutionStatus.loading;
    notifyListeners();

    _postAnswerMeta(correct, timeSpent, q);

    final sol = await _generateSolution(q, buddyId, ans ?? '');
    solution = _reconcileAnswerLine(sol, ans);
    solutionStatus = SolutionStatus.done;
    solutionBuddyId = buddyId;

    _saveSession({
      'selectedOption': opt, 'isCorrect': correct,
      'solution': solution, 'solutionRequested': true,
      'solutionBuddyId': buddyId, 'isRestricted': false,
    });

    // After 5th question — show pass modal once
    if (!isUserPaid && isNewSolve && attemptsToday == kFreeDailyLimit) {
      await Future.delayed(const Duration(milliseconds: 1500));
      showPassModal = true;
    }

    notifyListeners();
  }

  Future<void> handleIntegerSubmit() async {
    if (isCorrect != null || integerAnswer.trim().isEmpty) return;
    final q = currentQuestion; if (q == null) return;

    final timeSpent = DateTime.now().difference(_questionStartTime).inSeconds;
    final isNewSolve = !_answeredThisSession.contains(q.questionId);

    if (isNewSolve) {
      _answeredThisSession.add(q.questionId);
      attemptsToday += 1;
      await _ensurePrefs();
      await _prefs!.setInt(_todayKey(), attemptsToday);
    }

    final isUserPaid = hasPass == true;
    final isRestricted = !isUserPaid && (isNewSolve ? attemptsToday - 1 : attemptsToday) >= kFreeDailyLimit;

    final ans = q.correctOption;
    final u = double.tryParse(integerAnswer.trim());
    final c2 = double.tryParse(ans ?? '');
    final correct = (u != null && c2 != null) ? u == c2 : integerAnswer.trim() == (ans ?? '').trim();

    isCorrect           = correct;
    selectedOption      = 'INTEGER';
    resolvedCorrectOption = ans;
    notifyListeners();

    if (isRestricted) {
      isCurrentRestricted = true;
      solutionStatus = SolutionStatus.restricted;
      showPassModal = true;
      _postAnswerMeta(correct, timeSpent, q);
      notifyListeners();
      return;
    }

    isCurrentRestricted = false;
    solutionStatus = SolutionStatus.loading;
    notifyListeners();

    _postAnswerMeta(correct, timeSpent, q);
    final sol = await _generateSolution(q, buddyId, ans ?? '');
    solution = _reconcileAnswerLine(sol, ans);
    solutionStatus = SolutionStatus.done;
    solutionBuddyId = buddyId;
    notifyListeners();
  }

  // ─── Solution generation ──────────────────────────────────────────────────
  Future<String> _generateSolution(Question q, String bId, String confirmedAnswer) async {
    final buddy = kAiBuddies[bId] ?? kAiBuddies[kDefaultBuddyId]!;
    await _ensurePrefs();

    // 1. Session cache
    final cacheKey = '$kAiSolCache:viewer:${q.questionId}:$bId';
    final cached = _prefs!.getString(cacheKey);
    if (cached != null && cached.isNotEmpty) return cached;

    // 2. Buddy column
    final colSol = q.buddySolution(bId);
    if (colSol != null && colSol.trim().isNotEmpty) {
      await _prefs!.setString(cacheKey, colSol);
      return colSol;
    }

    // 3. Supabase DB column
    try {
      final row = await supabase
          .from(dbTable)
          .select(buddy.columnKey)
          .eq('question_id', q.questionId)
          .maybeSingle();
      final dbSol = row?[buddy.columnKey] as String?;
      if (dbSol != null && dbSol.trim().isNotEmpty) {
        await _prefs!.setString(cacheKey, dbSol);
        return dbSol;
      }
    } catch (_) {}

    // 4. AI generation
    try {
      final resp = await _dio.post('$kApiBase/solution', data: {
        'action': 'generate_solution',
        'question_text': q.questionText,
        'option_A': q.optionA, 'option_B': q.optionB,
        'option_C': q.optionC, 'option_D': q.optionD,
        'solution': q.solution,
        'correct_option': confirmedAnswer,
        'buddy_id': bId,
        'buddy_name': buddy.name,
        'buddy_system_prompt': buddy.systemPrompt,
      });
      final aiSol = resp.data['solution'] as String? ?? q.solution ?? '';
      await _prefs!.setString(cacheKey, aiSol);
      // Write back to Supabase
      supabase.from(dbTable).update({buddy.columnKey: aiSol}).eq('question_id', q.questionId).then((_) {});
      return aiSol;
    } catch (_) {
      return q.solution ?? '';
    }
  }

  // ─── Post-answer side-effects ─────────────────────────────────────────────
  void _postAnswerMeta(bool correct, int timeSpent, Question q) {
    // Write attempt
    if (userId != null) {
      supabase.from('attempts').insert({
        'student_id': userId,
        'question_id': q.questionId,
        'correct': correct,
        'time_taken_sec': timeSpent,
      }).then((_) {}).catchError((_) {});
    }

    // Auto-bookmark wrong answers
    if (!correct) _autoBookmarkWrong(q);

    // Coins (only on new solves)
    if (correct) {
      final coins = _calcCoins(timeSpent);
      rookieCoins += coins;
      _updateCoinsInDb(coins);
    }

    notifyListeners();
  }

  int _calcCoins(int timeSpent) {
    if (timeSpent <= 30) return 10;
    if (timeSpent <= 60) return 9;
    if (timeSpent <= 90) return 8;
    if (timeSpent <= 120) return 7;
    return 6;
  }

  void _updateCoinsInDb(int add) async {
    if (userId == null || add <= 0) return;
    try {
      final row = await supabase.from('users').select('rookieCoinsEarned').eq('id', userId!).maybeSingle();
      final current = row?['rookieCoinsEarned'] as int? ?? 0;
      await supabase.from('users').update({'rookieCoinsEarned': current + add}).eq('id', userId!);
    } catch (_) {}
  }

  void _autoBookmarkWrong(Question q) async {
    await _ensurePrefs();
    try {
      final raw = _prefs!.getString(kBookmarksKey);
      final arr = raw != null ? jsonDecode(raw) as List : [];
      final exists = arr.any((b) => (b as Map)['question_id'] == q.questionId);
      if (!exists) {
        arr.add({'question_id': q.questionId, 'question_text': q.questionText, 'subject': q.subject, 'chapter': q.chapter});
        await _prefs!.setString(kBookmarksKey, jsonEncode(arr));
      }
    } catch (_) {}
  }

  // ─── Bookmark toggle ──────────────────────────────────────────────────────
  void toggleBookmark() async {
    final q = currentQuestion; if (q == null) return;
    await _ensurePrefs();
    try {
      final raw = _prefs!.getString(kBookmarksKey);
      var arr = raw != null ? (jsonDecode(raw) as List) : <dynamic>[];
      if (!bookmarked) {
        arr.add({'question_id': q.questionId, 'question_text': q.questionText, 'subject': q.subject, 'chapter': q.chapter});
        bookmarked = true;
      } else {
        arr = arr.where((b) => (b as Map)['question_id'] != q.questionId).toList();
        bookmarked = false;
      }
      await _prefs!.setString(kBookmarksKey, jsonEncode(arr));
      notifyListeners();
    } catch (_) {}
  }

  // ─── Followup explanation ─────────────────────────────────────────────────
  Future<void> handleAiFollowup() async {
    if (isCurrentRestricted) { showPassModal = true; notifyListeners(); return; }
    final q = currentQuestion; if (q == null) return;
    aiFollowupLoading = true; aiFollowup = null; notifyListeners();
    try {
      final buddy = kAiBuddies[buddyId] ?? kAiBuddies[kDefaultBuddyId]!;
      final resp = await _dio.post('$kApiBase/solution', data: {
        'action': 'better_understanding',
        'question_text': q.questionText,
        'solution': q.solution,
        'buddy_id': buddyId,
        'buddy_name': buddy.name,
        'buddy_system_prompt': buddy.systemPrompt,
      });
      aiFollowup = resp.data['explanation'] as String? ?? 'Could not generate explanation.';
    } catch (_) {
      aiFollowup = 'Error generating explanation. Please try again.';
    }
    aiFollowupLoading = false;
    notifyListeners();
  }

  // ─── Pass success ─────────────────────────────────────────────────────────
  void onPassSuccess() async {
    await _checkPass();
    isCurrentRestricted = false;
    showPassModal = false;
    final q = currentQuestion;
    if (q != null && selectedOption != null && solution.isEmpty) {
      solutionStatus = SolutionStatus.loading;
      notifyListeners();
      final sol = await _generateSolution(q, solutionBuddyId, resolvedCorrectOption ?? q.correctOption ?? '');
      solution = _reconcileAnswerLine(sol, resolvedCorrectOption);
      solutionStatus = SolutionStatus.done;
    }
    notifyListeners();
  }

  void dismissPassModal() { showPassModal = false; notifyListeners(); }
  void openPassModal()    { showPassModal = true;  notifyListeners(); }

  void updateIntegerAnswer(String v) { integerAnswer = v; notifyListeners(); }
  void tickTimer() { timer++; notifyListeners(); }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  String _normalize(String? v) {
    if (v == null || v.isEmpty) return '';
    return v.replaceAll(RegExp(r'option_?', caseSensitive: false), '')
        .replaceAll(RegExp(r'[^a-dA-D]'), '')
        .substring(0, 1).toLowerCase();
  }

  String _reconcileAnswerLine(String sol, String? correctAns) {
    if (correctAns == null || correctAns.isEmpty) return sol;
    return sol;
  }

  // Timer
  void resetTimer() { timer = 0; _questionStartTime = DateTime.now(); notifyListeners(); }

  // Buddy change
  void changeBuddy(String id) async {
    buddyId = id;
    solutionBuddyId = id;
    await _ensurePrefs();
    await _prefs!.setString(kSelectedBuddy, id);
    notifyListeners();
  }
}
