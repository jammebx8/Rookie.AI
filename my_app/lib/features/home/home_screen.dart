// home_screen.dart
// Home page — mirrors app/(tabs)/home/page.tsx exactly
// Uses Dropper design system components

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/dropper_theme.dart';
import '../../core/constants.dart';
import '../../core/models.dart';
import '../../shared/widgets/dropper_widgets.dart';
import '../../shared/widgets/latex_renderer.dart';
import 'home_provider.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => HomeProvider(),
      child: const _HomeView(),
    );
  }
}

class _HomeView extends StatefulWidget {
  const _HomeView();
  @override
  State<_HomeView> createState() => _HomeViewState();
}

class _HomeViewState extends State<_HomeView> with TickerProviderStateMixin {
  late final AnimationController _motController;

  @override
  void initState() {
    super.initState();
    _motController = AnimationController(vsync: this, duration: const Duration(milliseconds: 8000))
      ..repeat();
  }

  @override
  void dispose() {
    _motController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    return Scaffold(
      backgroundColor: c.canvas,
      body: SafeArea(
        child: Consumer<HomeProvider>(
          builder: (context, provider, _) => CustomScrollView(
            slivers: [
              // ── App bar ──────────────────────────────────────────────────
              _HomeAppBar(provider: provider),
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: DropperSpace.gutter),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    const SizedBox(height: 24),

                    // ── Greeting + headline ─────────────────────────────
                    _GreetingSection(provider: provider)
                        .animate().fadeIn(duration: 350.ms).slideY(begin: 0.05, end: 0),

                    const SizedBox(height: 8),

                    // ── Motivational line ────────────────────────────────
                    _MotivationLine(provider: provider)
                        .animate().fadeIn(delay: 50.ms, duration: 350.ms),

                    const SizedBox(height: 20),

                    // ── Buddy message ────────────────────────────────────
                    _BuddyHomeMessage(provider: provider)
                        .animate().fadeIn(delay: 100.ms, duration: 350.ms).slideY(begin: 0.05, end: 0),

                    const SizedBox(height: DropperSpace.stackLg),

                    // ── Metrics row ─────────────────────────────────────
                    DSectionHeader(title: 'Your progress'),
                    _MetricsGrid(provider: provider)
                        .animate().fadeIn(delay: 150.ms, duration: 350.ms),

                    const SizedBox(height: DropperSpace.stackLg),

                    // ── Recommended question ─────────────────────────────
                    DSectionHeader(
                      title: 'Your next question',
                      action: Text('Picked for you', style: DropperText.meta(color: c.fgMuted)),
                    ),
                    _RecommendedQuestionCard(provider: provider)
                        .animate().fadeIn(delay: 200.ms, duration: 350.ms),

                    const SizedBox(height: DropperSpace.stackLg),

                    // ── Rookie Pass banner ───────────────────────────────
                    _RookiePassBanner()
                        .animate().fadeIn(delay: 250.ms, duration: 350.ms),

                    const SizedBox(height: DropperSpace.stackLg),

                    // ── Community / Footer ───────────────────────────────
                    _HomeFooter(),

                    const SizedBox(height: 48),
                  ]),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── App Bar ─────────────────────────────────────────────────────────────────
class _HomeAppBar extends StatelessWidget {
  final HomeProvider provider;
  const _HomeAppBar({required this.provider});

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    return SliverAppBar(
      floating: true,
      snap: true,
      backgroundColor: c.surface.withValues(alpha: 0.92),
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      title: Row(
        children: [
          // Owl logo
          Container(
            width: 28, height: 28,
            decoration: BoxDecoration(
              color: c.actionSecondary,
              borderRadius: DropperRadius.controlBR,
            ),
            child: Center(
              child: Text('R', style: DropperText.label(color: c.actionPrimary).copyWith(fontWeight: FontWeight.w700)),
            ),
          ),
          const SizedBox(width: 8),
          Text('Rookie', style: DropperText.body(color: c.fg).copyWith(fontWeight: FontWeight.w700)),
          Text('.AI', style: DropperText.body(color: c.actionPrimary).copyWith(fontWeight: FontWeight.w700)),
        ],
      ),
      actions: [
        // Coins
        Container(
          margin: const EdgeInsets.only(right: 4),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: c.surface,
            borderRadius: DropperRadius.controlBR,
            border: Border.all(color: c.lineDefault),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.toll_rounded, size: 15, color: c.fgMuted),
              const SizedBox(width: 4),
              Text('${provider.rookieCoins}',
                  style: DropperText.label(color: c.fg)),
            ],
          ),
        ),
        // Buddy avatar
        GestureDetector(
          onTap: () => _showBuddySelector(context, provider),
          child: Padding(
            padding: const EdgeInsets.only(right: 12),
            child: CircleAvatar(
              radius: 14,
              backgroundColor: c.lineDefault,
              backgroundImage: CachedNetworkImageProvider(provider.currentBuddy.imageUrl),
            ),
          ),
        ),
      ],
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(3),
        child: Container(height: 3, color: c.lineSubtle),
      ),
    );
  }

  void _showBuddySelector(BuildContext context, HomeProvider provider) {
    showModalBottomSheet(
      context: context,
      backgroundColor: context.dc.raised,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(DropperRadius.card)),
      ),
      builder: (_) => _BuddySelectorSheet(provider: provider),
    );
  }
}

// ─── Greeting ─────────────────────────────────────────────────────────────────
class _GreetingSection extends StatelessWidget {
  final HomeProvider provider;
  const _GreetingSection({required this.provider});

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    final left = provider.dailyGoal != null
        ? (provider.dailyGoal! - provider.solvedToday).clamp(0, provider.dailyGoal!)
        : 0;
    final firstName = provider.user?.firstName;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Page title
        Text(
          '${provider.greeting}${firstName != null ? ", $firstName" : ", learner"}',
          style: DropperText.heading(color: c.fg),
        ),
        const SizedBox(height: 4),
        // Target line
        RichText(
          text: TextSpan(
            style: DropperText.body(color: c.fgMuted),
            children: provider.dailyGoal == null
                ? [TextSpan(text: 'Set a daily goal and we\'ll track it here.')]
                : left > 0
                    ? [
                        WidgetSpan(child: Text('$left more', style: DropperText.body(color: c.fg).copyWith(fontWeight: FontWeight.w600))),
                        TextSpan(text: ' to hit today\'s target.'),
                      ]
                    : [
                        TextSpan(text: 'Aaj ka target done. '),
                        WidgetSpan(child: Text('${provider.solvedToday} solved', style: DropperText.body(color: c.fg).copyWith(fontWeight: FontWeight.w600))),
                        TextSpan(text: ' today.'),
                      ],
          ),
        ),

        const SizedBox(height: 16),

        // Daily practice CTA
        DButton(
          label: 'Daily practice',
          iconEnd: const Icon(Icons.arrow_forward),
          height: 44,
          onPressed: () => Navigator.pushNamed(context, '/question-viewer',
              arguments: {'mode': 'daily', 'subject': '', 'chapter': ''}),
        ),
      ],
    );
  }
}

// ─── Motivational line ─────────────────────────────────────────────────────
class _MotivationLine extends StatelessWidget {
  final HomeProvider provider;
  const _MotivationLine({required this.provider});

  @override
  Widget build(BuildContext context) {
    return Text(
      provider.motivationalLine,
      style: DropperText.bodySm(color: context.dc.fgMuted),
    );
  }
}

// ─── Buddy message ────────────────────────────────────────────────────────────
class _BuddyHomeMessage extends StatelessWidget {
  final HomeProvider provider;
  const _BuddyHomeMessage({required this.provider});

  String _getMessage() {
    final solved  = provider.solvedToday;
    final buddy   = provider.currentBuddy;

    if (solved >= 5) return '"Shabash! Daily 5 questions ka target pura! Flow toh amazing hai, aise hi chalo!" — ${buddy.name}';
    if (solved > 0)  return '"${solved} questions solve kar liye — acha momentum hai. Bas consistent rehna." — ${buddy.name}';

    // Not started
    final msgs = [
      '"Tension lene ki zarurat nahi hai. Bas 5 questions nipta lo, bas yahi catch tha!" — ${buddy.name}',
      '"Roz ke bas 5 questions bhi tumhe race mein aage le aayenge. Chalo, start karein!" — ${buddy.name}',
      '"Overthinking se percentile nahi aati, questions solve karne se aati hai. Shuru karo!" — ${buddy.name}',
    ];
    return msgs[DateTime.now().hour % msgs.length];
  }

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    final buddy = provider.currentBuddy;

    return DCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Avatar
          CircleAvatar(
            radius: 22,
            backgroundImage: CachedNetworkImageProvider(buddy.imageUrl),
            backgroundColor: c.lineDefault,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(buddy.name, style: DropperText.label(color: c.fg)),
                const SizedBox(height: 4),
                Text(
                  _getMessage(),
                  style: DropperText.body(color: c.fgSecond).copyWith(height: 1.5),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: c.sunken,
                        borderRadius: DropperRadius.controlBR,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.bolt, size: 13, color: c.actionPrimary),
                          const SizedBox(width: 4),
                          Text(
                            provider.solvedToday >= 5
                                ? 'Daily 5 crushed! Ready for revision?'
                                : provider.streak.current >= 3
                                    ? '${provider.streak.current}-day streak!'
                                    : '5 questions daily = 99 percentile',
                            style: DropperText.meta(color: c.fgMuted),
                          ),
                        ],
                      ),
                    ),
                    const Spacer(),
                    GestureDetector(
                      onTap: () => Navigator.pushNamed(context, '/question-viewer',
                          arguments: {'mode': 'daily', 'subject': '', 'chapter': ''}),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            provider.solvedToday >= 5 ? 'Solve more' : 'Start practice',
                            style: DropperText.label(color: c.actionPrimary),
                          ),
                          const SizedBox(width: 4),
                          Icon(Icons.arrow_forward, size: 14, color: c.actionPrimary),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Metrics grid ─────────────────────────────────────────────────────────────
class _MetricsGrid extends StatelessWidget {
  final HomeProvider provider;
  const _MetricsGrid({required this.provider});

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    if (provider.loadingStreak) {
      return GridView.count(
        crossAxisCount: 2, shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 12, crossAxisSpacing: 12,
        childAspectRatio: 1.2,
        children: List.generate(4, (_) => DSkeleton(height: 120, borderRadius: DropperRadius.cardBR)),
      );
    }

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.15,
      children: [
        // ── Streak ──────────────────────────────────────────────────────
        DMetricCard(
          icon: Icons.local_fire_department,
          label: 'Streak',
          value: RichText(
            text: TextSpan(
              style: DropperText.value_(color: c.fg),
              children: [
                TextSpan(text: '${provider.streak.current}'),
                TextSpan(
                  text: ' day${provider.streak.current != 1 ? 's' : ''}',
                  style: DropperText.body(color: c.fgMuted).copyWith(fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
          bottom: _WeekStrip(streak: provider.streak),
        ),

        // ── Today ────────────────────────────────────────────────────────
        DMetricCard(
          icon: Icons.my_library_books_outlined,
          label: 'Today',
          value: provider.dailyGoal != null
              ? RichText(
                  text: TextSpan(
                    style: DropperText.value_(color: c.fg),
                    children: [
                      TextSpan(text: '${provider.solvedToday}'),
                      TextSpan(
                        text: ' / ${provider.dailyGoal}',
                        style: DropperText.body(color: c.fgMuted).copyWith(fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                )
              : RichText(
                  text: TextSpan(
                    style: DropperText.value_(color: c.fg),
                    children: [
                      TextSpan(text: '${provider.solvedToday}'),
                      TextSpan(text: ' solved', style: DropperText.body(color: c.fgMuted).copyWith(fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
          bottom: provider.dailyGoal != null
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    DBar(value: provider.goalPct),
                    const SizedBox(height: 6),
                    Text('${provider.goalPct.toInt()}% of today\'s target',
                        style: DropperText.meta(color: c.fgMuted)),
                  ],
                )
              : GestureDetector(
                  onTap: () => _showGoalPicker(context, provider),
                  child: Text('Set a daily goal', style: DropperText.meta(color: c.link)),
                ),
          action: GestureDetector(
            onTap: () => _showGoalPicker(context, provider),
            child: Text('Change', style: DropperText.meta(color: c.fgMuted)),
          ),
        ),

        // ── Longest streak ───────────────────────────────────────────────
        DMetricCard(
          icon: Icons.emoji_events_outlined,
          label: 'Longest streak',
          value: RichText(
            text: TextSpan(
              style: DropperText.value_(color: c.fg),
              children: [
                TextSpan(text: '${provider.streak.longest}'),
                TextSpan(
                  text: ' day${provider.streak.longest != 1 ? 's' : ''}',
                  style: DropperText.body(color: c.fgMuted).copyWith(fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
          bottom: Text('Your best run so far', style: DropperText.meta(color: c.fgMuted)),
        ),

        // ── This month ───────────────────────────────────────────────────
        _MonthMetric(streak: provider.streak),
      ],
    );
  }

  void _showGoalPicker(BuildContext context, HomeProvider provider) {
    showModalBottomSheet(
      context: context,
      backgroundColor: context.dc.raised,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(DropperRadius.card)),
      ),
      builder: (_) => _GoalPickerSheet(provider: provider),
    );
  }
}

class _WeekStrip extends StatelessWidget {
  final StreakData streak;
  const _WeekStrip({required this.streak});

  static const _days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    final today = DateTime.now();
    final todayDow = today.weekday - 1; // Mon=0

    return Row(
      children: List.generate(7, (i) {
        final diff = i - todayDow;
        final d = today.add(Duration(days: diff));
        final key = '${d.year}-${d.month}-${d.day}';
        final active = streak.activeDays.contains(key);
        final isToday = i == todayDow;

        return Container(
          width: 22, height: 22,
          margin: const EdgeInsets.only(right: 3),
          decoration: BoxDecoration(
            color: active ? c.actionPrimary : c.sunken,
            shape: BoxShape.circle,
            border: isToday && !active ? Border.all(color: c.actionPrimary) : null,
          ),
          alignment: Alignment.center,
          child: Text(_days[i],
              style: DropperText.caption(
                  color: active ? c.onPrimary : isToday ? c.actionPrimary : c.fgMuted)),
        );
      }),
    );
  }
}

class _MonthMetric extends StatelessWidget {
  final StreakData streak;
  const _MonthMetric({required this.streak});

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    final now = DateTime.now();
    final prefix = '${now.year}-${now.month}-';
    final count = streak.activeDays.where((k) => k.startsWith(prefix)).length;
    final sofar = now.day;

    return DMetricCard(
      icon: Icons.calendar_today_outlined,
      label: 'This month',
      value: RichText(
        text: TextSpan(
          style: DropperText.value_(color: c.fg),
          children: [
            TextSpan(text: '$count'),
            TextSpan(
              text: ' day${count != 1 ? 's' : ''}',
              style: DropperText.body(color: c.fgMuted).copyWith(fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
      bottom: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DBar(value: (count / sofar * 100).clamp(0, 100)),
          const SizedBox(height: 6),
          Text('Active on $count of $sofar days', style: DropperText.meta(color: c.fgMuted)),
        ],
      ),
    );
  }
}

// ─── Recommended question card ────────────────────────────────────────────────
class _RecommendedQuestionCard extends StatelessWidget {
  final HomeProvider provider;
  const _RecommendedQuestionCard({required this.provider});

  @override
  Widget build(BuildContext context) {
    final c = context.dc;

    if (provider.loadingRecommended) {
      return DCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [DSkeleton(width: 80, height: 22), const SizedBox(width: 8), DSkeleton(width: 50, height: 22)]),
            const SizedBox(height: 16),
            DSkeleton(width: double.infinity, height: 14),
            const SizedBox(height: 8),
            DSkeleton(width: 240, height: 14),
            const SizedBox(height: 20),
            ...List.generate(4, (_) => Padding(padding: const EdgeInsets.only(bottom: 8), child: DSkeleton(height: 48))),
          ],
        ),
      );
    }

    if (provider.recommendedError != null || provider.recommendedQuestion == null) {
      return DCard(
        child: DEmptyState(
          icon: Icons.explore_outlined,
          title: 'No question picked yet',
          subtitle: 'Solve a few PYQs and Rookie will pick your next one from your weak spots.',
          action: DButton(
            label: 'Browse chapters',
            variant: DButtonVariant.secondary,
            iconEnd: const Icon(Icons.arrow_forward),
            onPressed: () => Navigator.pushNamed(context, '/explore'),
          ),
        ),
      );
    }

    final q   = provider.recommendedQuestion!;
    final ans = provider.recSelectedOption;
    final cor = provider.recIsCorrect;

    final corrLetter = (q.correctOption ?? '')
        .replaceAll(RegExp(r'option_?', caseSensitive: false), '')
        .replaceAll(RegExp(r'[^a-dA-D]'), '')
        .substring(0, (q.correctOption?.length ?? 0) > 0 ? 1 : 0)
        .toLowerCase();

    return DCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Tags + bookmark
          Row(
            children: [
              if (q.examShift != null) DTag(q.examShift!.replaceAll('_', ' ')),
              if (q.subject != null) ...[const SizedBox(width: 6), DTag(q.subject!)],
              const Spacer(),
              GestureDetector(
                onTap: () {/* bookmark handled by provider.handleRecommendedAnswer via bookmark icon */},
                child: Icon(Icons.bookmark_border, size: 20, color: c.fgMuted),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Question text
          LatexText(
            text: q.questionText ?? '',
            style: DropperText.bodyLg(color: c.fg),
          ),

          if (q.questionImgUrl != null) ...[
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: DropperRadius.controlBR,
              child: CachedNetworkImage(imageUrl: q.questionImgUrl!, fit: BoxFit.contain, height: 150),
            ),
          ],

          const SizedBox(height: 20),

          // Options
          ...(['a','b','c','d']).map((optKey) {
            final text = switch(optKey) {
              'a' => q.optionA, 'b' => q.optionB, 'c' => q.optionC, _ => q.optionD,
            };
            if (text == null || text.isEmpty) return const SizedBox.shrink();

            final sel  = ans == optKey;
            final corr = optKey == corrLetter;
            final state = ans == null
                ? OmrState.idle
                : corr ? OmrState.right : sel ? OmrState.wrong : OmrState.idle;

            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: DOmrOption(
                letter: optKey.toUpperCase(),
                state: state,
                disabled: ans != null,
                onTap: () => provider.handleRecommendedAnswer(optKey),
                child: LatexText(text: text, style: DropperText.bodySm(color: c.fg)),
              ),
            );
          }),

          const SizedBox(height: 12),

          // Verdict + actions
          Row(
            children: [
              if (cor != null)
                Text(
                  cor ? 'Sahi jawab!' : 'Not quite. Keep going.',
                  style: DropperText.body(color: cor ? c.success : c.danger)
                      .copyWith(fontWeight: FontWeight.w600),
                ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.1, end: 0),
              const Spacer(),
              DButton(
                label: ans != null ? 'See solution' : 'Solve now',
                variant: ans != null ? DButtonVariant.secondary : DButtonVariant.ghost,
                iconEnd: const Icon(Icons.arrow_forward),
                height: 36,
                onPressed: () => Navigator.pushNamed(
                  context, '/question-viewer',
                  arguments: {
                    'subject': q.subject ?? '',
                    'chapter': q.chapter ?? '',
                    'qid': q.questionId,
                    'examName': 'JEE Main',
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ─── Rookie Pass banner ───────────────────────────────────────────────────────
class _RookiePassBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: DropperGradients.passGradient,
        borderRadius: DropperRadius.cardBR,
      ),
      padding: const EdgeInsets.all(DropperSpace.cardLg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('Rookie Pass',
                  style: DropperText.label(color: Colors.white).copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: DropperRadius.tagBR,
                ),
                child: Text('Yearly', style: DropperText.caption(color: Colors.white)),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text('₹999', style: DropperText.price(color: Colors.white)),
          const SizedBox(height: 4),
          Text('/ year · Just ₹83 a month',
              style: DropperText.bodySm(color: Colors.white.withValues(alpha: 0.7))),
          const SizedBox(height: 16),
          ...['Unlimited AI solutions', 'JEE Advanced full access', 'Custom test wizard',
              'Hover-to-understand equations'].map((p) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                Icon(Icons.check, size: 16, color: DropperPalette.marigold300),
                const SizedBox(width: 8),
                Text(p, style: DropperText.bodySm(color: Colors.white.withValues(alpha: 0.9))),
              ],
            ),
          )),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => Navigator.pushNamed(context, '/checkout'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: DropperPalette.navy800,
                shape: RoundedRectangleBorder(borderRadius: DropperRadius.controlBR),
                minimumSize: const Size(double.infinity, 44),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('Get 1 year · ₹999',
                      style: DropperText.body(color: DropperPalette.navy800)
                          .copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(width: 6),
                  const Icon(Icons.arrow_forward, size: 16),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Footer ───────────────────────────────────────────────────────────────────
class _HomeFooter extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    return Column(
      children: [
        DCard(
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Invite friends', style: DropperText.title(color: c.fg)),
                    const SizedBox(height: 4),
                    Text('Share Rookie and study together.',
                        style: DropperText.bodySm(color: c.fgMuted)),
                  ],
                ),
              ),
              DButton(
                label: 'Invite',
                variant: DButtonVariant.secondary,
                iconEnd: const Icon(Icons.share),
                height: 36,
                onPressed: () {},
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Rookie.AI · JEE preparation', style: DropperText.meta(color: c.fgMuted)),
          ],
        ),
      ],
    );
  }
}

// ─── Buddy Selector Sheet ─────────────────────────────────────────────────────
class _BuddySelectorSheet extends StatelessWidget {
  final HomeProvider provider;
  const _BuddySelectorSheet({required this.provider});

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    return Padding(
      padding: const EdgeInsets.all(DropperSpace.card),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Choose your buddy', style: DropperText.title(color: c.fg)),
          const SizedBox(height: 4),
          Text('Who should explain your solutions?', style: DropperText.bodySm(color: c.fgMuted)),
          const SizedBox(height: 16),
          ...kAiBuddies.entries.map((e) {
            final active = provider.selectedBuddyId == e.key;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: GestureDetector(
                onTap: () {
                  provider.setSelectedBuddy(e.key);
                  Navigator.pop(context);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: active ? c.actionSecondary : c.sunken,
                    borderRadius: DropperRadius.controlBR,
                    border: Border.all(
                        color: active ? c.actionPrimary : c.lineDefault),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 18,
                        backgroundImage: CachedNetworkImageProvider(e.value.imageUrl),
                        backgroundColor: c.lineDefault,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(e.value.name,
                            style: DropperText.body(color: c.fg).copyWith(fontWeight: FontWeight.w500)),
                      ),
                      if (active) Icon(Icons.check, size: 16, color: c.actionPrimary),
                    ],
                  ),
                ),
              ),
            );
          }),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

// ─── Goal Picker Sheet ────────────────────────────────────────────────────────
class _GoalPickerSheet extends StatefulWidget {
  final HomeProvider provider;
  const _GoalPickerSheet({required this.provider});
  @override
  State<_GoalPickerSheet> createState() => _GoalPickerSheetState();
}

class _GoalPickerSheetState extends State<_GoalPickerSheet> {
  final _ctrl = TextEditingController();
  String? _error;

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    const opts = [5, 10, 20, 30, 50];
    return Padding(
      padding: EdgeInsets.only(
        left: DropperSpace.card, right: DropperSpace.card,
        top: DropperSpace.card,
        bottom: MediaQuery.of(context).viewInsets.bottom + DropperSpace.card,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Questions per day', style: DropperText.title(color: c.fg)),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8, runSpacing: 8,
            children: opts.map((g) => DChip(
              label: '$g Qs',
              active: widget.provider.dailyGoal == g,
              onTap: () { widget.provider.setDailyGoal(g); Navigator.pop(context); },
            )).toList(),
          ),
          const SizedBox(height: 20),
          Text('Custom goal', style: DropperText.label(color: c.fgMuted)),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _ctrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(hintText: 'e.g. 15'),
                ),
              ),
              const SizedBox(width: 8),
              DButton(
                label: 'Set',
                height: 44,
                onPressed: () {
                  final v = int.tryParse(_ctrl.text);
                  if (v == null || v < 1) { setState(() => _error = 'Enter a number ≥ 1'); return; }
                  if (v > 500)            { setState(() => _error = 'Max 500 questions'); return; }
                  widget.provider.setDailyGoal(v);
                  Navigator.pop(context);
                },
              ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 6),
            Text(_error!, style: DropperText.caption(color: c.danger)),
          ],
        ],
      ),
    );
  }
}
