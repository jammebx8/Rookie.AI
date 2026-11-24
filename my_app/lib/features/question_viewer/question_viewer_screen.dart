// question_viewer_screen.dart
// Question viewer screen — mirrors QuestionViewerClient.tsx exactly
// Full MCQ + Integer question solving with AI solutions, daily limit gate

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/dropper_theme.dart';
import '../../core/constants.dart';
import '../../core/models.dart';
import '../../shared/widgets/dropper_widgets.dart';
import '../../shared/widgets/latex_renderer.dart';
import 'question_viewer_provider.dart';

class QuestionViewerScreen extends StatelessWidget {
  final String subject;
  final String chapter;
  final String examName;
  final String? startQid;
  final int    startIndex;
  final bool   isDaily;

  const QuestionViewerScreen({
    super.key,
    required this.subject,
    required this.chapter,
    this.examName = 'JEE Main',
    this.startQid,
    this.startIndex = 0,
    this.isDaily = false,
  });

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => QuestionViewerProvider(
        subject:    subject,
        chapter:    chapter,
        examName:   examName,
        startQid:   startQid,
        startIndex: startIndex,
        isDaily:    isDaily,
      ),
      child: const _QuestionViewerView(),
    );
  }
}

// ─── Main view ────────────────────────────────────────────────────────────────
class _QuestionViewerView extends StatefulWidget {
  const _QuestionViewerView();
  @override
  State<_QuestionViewerView> createState() => _QuestionViewerViewState();
}

class _QuestionViewerViewState extends State<_QuestionViewerView> {
  Timer? _timerTick;
  final _scrollCtrl = ScrollController();
  final _solutionKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    _timerTick = Timer.periodic(const Duration(seconds: 1), (_) {
      context.read<QuestionViewerProvider>().tickTimer();
    });
  }

  @override
  void dispose() {
    _timerTick?.cancel();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _scrollToSolution() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final ctx = _solutionKey.currentContext;
      if (ctx != null) {
        Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 400),
            curve: Curves.easeOut, alignment: 0.0);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    return Consumer<QuestionViewerProvider>(
      builder: (context, provider, _) {
        // Show pass modal if needed
        if (provider.showPassModal) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (provider.showPassModal) _showPassModal(context, provider);
          });
        }

        if (provider.loadingQuestions) return _LoadingScreen(isDaily: provider.isDaily, chapter: provider.chapter);

        final q = provider.currentQuestion;
        if (q == null) {
          return Scaffold(
            backgroundColor: c.canvas,
            appBar: _buildAppBar(context, provider),
            body: const DEmptyState(
              icon: Icons.layers_outlined,
              title: 'No questions here yet',
              subtitle: 'No questions available for this chapter.',
            ),
          );
        }

        return Scaffold(
          backgroundColor: c.canvas,
          appBar: _buildAppBar(context, provider),
          body: SingleChildScrollView(
            controller: _scrollCtrl,
            padding: const EdgeInsets.symmetric(
                horizontal: DropperSpace.gutter, vertical: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Question card ──────────────────────────────────────
                _QuestionCard(q: q, provider: provider)
                    .animate().fadeIn(duration: 250.ms).slideY(begin: 0.04, end: 0),

                // ── Post-answer section ────────────────────────────────
                if (provider.selectedOption != null) ...[
                  const SizedBox(height: 16),
                  _PostAnswerSection(
                    q: q,
                    provider: provider,
                    solutionKey: _solutionKey,
                    onSolutionReady: _scrollToSolution,
                  ).animate().fadeIn(delay: 50.ms, duration: 300.ms).slideY(begin: 0.05, end: 0),
                ],

                const SizedBox(height: 48),
              ],
            ),
          ),
          // Bottom navigation
          bottomNavigationBar: _BottomNav(provider: provider),
        );
      },
    );
  }

  AppBar _buildAppBar(BuildContext context, QuestionViewerProvider provider) {
    final c = context.dc;
    final total = provider.totalCount > 0 ? provider.totalCount : provider.questions.length;
    final mins  = provider.timer ~/ 60;
    final secs  = (provider.timer % 60).toString().padLeft(2, '0');

    return AppBar(
      backgroundColor: c.surface.withValues(alpha: 0.92),
      surfaceTintColor: Colors.transparent,
      leading: IconButton(
        icon: Icon(Icons.chevron_left, color: c.fgMuted),
        onPressed: () => Navigator.pop(context),
      ),
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            provider.isDaily ? 'Daily Practice' : provider.chapter,
            style: DropperText.body(color: c.fg).copyWith(fontWeight: FontWeight.w600),
            overflow: TextOverflow.ellipsis,
          ),
          Row(
            children: [
              Text('Q ${provider.globalIndex + 1} / $total',
                  style: DropperText.meta(color: c.fgMuted)),
              const SizedBox(width: 6),
              Icon(Icons.access_time, size: 12, color: c.fgMuted),
              const SizedBox(width: 2),
              Text('$mins:$secs', style: DropperText.meta(color: c.fgMuted)),
            ],
          ),
        ],
      ),
      actions: [
        // Coins
        Container(
          margin: const EdgeInsets.only(right: 4),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: c.surface, borderRadius: DropperRadius.controlBR,
            border: Border.all(color: c.lineDefault),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.toll_rounded, size: 14, color: c.fgMuted),
              const SizedBox(width: 4),
              Text('${provider.rookieCoins}', style: DropperText.label(color: c.fg)),
            ],
          ),
        ),
        // Bookmark
        IconButton(
          icon: Icon(
            provider.bookmarked ? Icons.bookmark : Icons.bookmark_border,
            color: provider.bookmarked ? c.actionPrimary : c.fgMuted,
            size: 20,
          ),
          onPressed: provider.toggleBookmark,
        ),
        // Buddy
        GestureDetector(
          onTap: () => _showBuddySelector(context, provider),
          child: Padding(
            padding: const EdgeInsets.only(right: 12),
            child: CircleAvatar(
              radius: 14,
              backgroundColor: c.lineDefault,
              backgroundImage: CachedNetworkImageProvider(
                  (kAiBuddies[provider.buddyId] ?? kAiBuddies[kDefaultBuddyId]!).imageUrl),
            ),
          ),
        ),
      ],
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(3),
        child: LinearProgressIndicator(
          value: total > 0 ? (provider.globalIndex + 1) / total : 0,
          backgroundColor: c.lineDefault,
          valueColor: AlwaysStoppedAnimation(c.actionPrimary),
          minHeight: 3,
        ),
      ),
    );
  }

  void _showPassModal(BuildContext context, QuestionViewerProvider provider) {
    showModalBottomSheet(
      context: context,
      isDismissible: true,
      enableDrag: true,
      backgroundColor: context.dc.raised,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(DropperRadius.card)),
      ),
      builder: (_) => _PassModalSheet(provider: provider),
    ).then((_) => provider.dismissPassModal());
  }

  void _showBuddySelector(BuildContext context, QuestionViewerProvider provider) {
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

// ─── Loading screen ───────────────────────────────────────────────────────────
class _LoadingScreen extends StatelessWidget {
  final bool isDaily;
  final String chapter;
  const _LoadingScreen({required this.isDaily, required this.chapter});

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    return Scaffold(
      backgroundColor: c.canvas,
      appBar: AppBar(
        backgroundColor: c.surface,
        surfaceTintColor: Colors.transparent,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            DSkeleton(width: 150, height: 14),
            const SizedBox(height: 4),
            DSkeleton(width: 80, height: 10),
          ],
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(DropperSpace.gutter),
        child: DCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [DSkeleton(width: 70, height: 20), const SizedBox(width: 8), DSkeleton(width: 50, height: 20)]),
              const SizedBox(height: 16),
              DSkeleton(width: double.infinity, height: 14),
              const SizedBox(height: 8),
              DSkeleton(width: 240, height: 14),
              const SizedBox(height: 8),
              DSkeleton(width: 180, height: 14),
              const SizedBox(height: 20),
              ...List.generate(4, (_) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: DSkeleton(height: 50),
              )),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Question card ────────────────────────────────────────────────────────────
class _QuestionCard extends StatelessWidget {
  final Question q;
  final QuestionViewerProvider provider;

  const _QuestionCard({required this.q, required this.provider});

  @override
  Widget build(BuildContext context) {
    final c = context.dc;

    return DCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Tags
          Wrap(
            spacing: 6, runSpacing: 6,
            children: [
              if (provider.isDaily) DTag('Daily Practice', tone: DTagTone.info),
              if (q.examShift != null) DTag(q.examShift!.replaceAll('_', ' ')),
              if (q.isInteger) DTag('Integer type'),
              DTag('+4 / −1'),
            ],
          ),

          const SizedBox(height: 20),

          // Question text
          LatexText(
            text: q.questionText ?? '',
            style: DropperText.bodyLg(color: c.fg),
          ),

          if (q.questionImgUrl != null) ...[
            const SizedBox(height: 16),
            GestureDetector(
              onTap: () => _showImageModal(context, q.questionImgUrl!),
              child: ClipRRect(
                borderRadius: DropperRadius.controlBR,
                child: CachedNetworkImage(
                  imageUrl: q.questionImgUrl!,
                  fit: BoxFit.contain,
                  height: 180,
                  width: double.infinity,
                ),
              ),
            ),
          ],

          const SizedBox(height: 24),

          // Options or integer input
          q.isInteger
              ? _IntegerInput(provider: provider)
              : _McqOptions(q: q, provider: provider),
        ],
      ),
    );
  }

  void _showImageModal(BuildContext context, String url) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        child: GestureDetector(
          onTap: () => Navigator.pop(context),
          child: InteractiveViewer(
            child: CachedNetworkImage(imageUrl: url),
          ),
        ),
      ),
    );
  }
}

// ─── MCQ Options ─────────────────────────────────────────────────────────────
class _McqOptions extends StatelessWidget {
  final Question q;
  final QuestionViewerProvider provider;

  const _McqOptions({required this.q, required this.provider});

  @override
  Widget build(BuildContext context) {
    final c    = context.dc;
    final ans  = provider.selectedOption;
    final pend = provider.pendingOption;
    final corrLetter = (provider.resolvedCorrectOption ?? q.correctOption ?? '')
        .replaceAll(RegExp(r'option_?', caseSensitive: false), '')
        .replaceAll(RegExp(r'[^a-dA-D]'), '').substring(0,
          (provider.resolvedCorrectOption ?? q.correctOption ?? '').isNotEmpty ? 1 : 0)
        .toLowerCase();

    return Column(
      children: ['a','b','c','d'].map((optKey) {
        final text = switch(optKey) {
          'a' => q.optionA, 'b' => q.optionB, 'c' => q.optionC, _ => q.optionD,
        };
        final imgUrl = switch(optKey) {
          'a' => q.optionAImg, 'b' => q.optionBImg, 'c' => q.optionCImg, _ => q.optionDImg,
        };
        if ((text == null || text.isEmpty) && imgUrl == null) return const SizedBox.shrink();

        final unanswered = ans == null && pend == null;
        final isPending  = ans == null && pend != null;
        final corr = optKey == corrLetter;

        final state = unanswered
            ? OmrState.idle
            : isPending
                ? (pend == optKey ? OmrState.selected : OmrState.idle)
                : corr
                    ? OmrState.right
                    : ans == optKey
                        ? OmrState.wrong
                        : OmrState.idle;

        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: DOmrOption(
            letter: optKey.toUpperCase(),
            state: state,
            disabled: !unanswered,
            onTap: unanswered ? () => provider.handleOptionClick(optKey) : null,
            child: Row(
              children: [
                Expanded(
                  child: imgUrl != null
                      ? CachedNetworkImage(imageUrl: imgUrl, height: 60, fit: BoxFit.contain)
                      : LatexText(text: text ?? '', style: DropperText.bodySm(color: c.fg)),
                ),
                if (isPending && pend == optKey) ...[
                  const SizedBox(width: 8),
                  DSpinner(size: 14),
                ],
                if (state == OmrState.right) ...[
                  const SizedBox(width: 8),
                  DTag('Correct', tone: DTagTone.success, icon: const Icon(Icons.check)),
                ],
                if (state == OmrState.wrong) ...[
                  const SizedBox(width: 8),
                  DTag('Your pick', tone: DTagTone.danger),
                ],
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}

// ─── Integer input ────────────────────────────────────────────────────────────
class _IntegerInput extends StatelessWidget {
  final QuestionViewerProvider provider;
  const _IntegerInput({required this.provider});

  @override
  Widget build(BuildContext context) {
    final c = context.dc;

    if (provider.isCorrect != null) {
      // Answered state
      return AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: provider.isCorrect! ? c.successSurface : c.dangerSurface,
          borderRadius: DropperRadius.controlBR,
          border: Border.all(color: provider.isCorrect! ? c.successBorder : c.dangerBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            DTag(provider.isCorrect! ? 'Sahi jawab!' : 'Not quite',
                tone: provider.isCorrect! ? DTagTone.success : DTagTone.danger),
            const SizedBox(height: 8),
            Text('Your answer: ', style: DropperText.bodySm(color: c.fg)),
            Text(provider.integerAnswer, style: DropperText.body(color: c.fg).copyWith(fontWeight: FontWeight.w700)),
            if (!provider.isCorrect! && provider.resolvedCorrectOption != null) ...[
              const SizedBox(height: 4),
              Text('Correct: ', style: DropperText.bodySm(color: c.fg)),
              Text(provider.resolvedCorrectOption!,
                  style: DropperText.body(color: c.success).copyWith(fontWeight: FontWeight.w700)),
            ],
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Your answer', style: DropperText.label(color: c.fgMuted)),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: TextField(
                keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                decoration: const InputDecoration(hintText: 'Type a number…'),
                onChanged: provider.updateIntegerAnswer,
                onSubmitted: (_) => provider.handleIntegerSubmit(),
                style: DropperText.title(color: c.fg),
              ),
            ),
            const SizedBox(width: 10),
            DButton(
              label: 'Check',
              iconStart: const Icon(Icons.check),
              height: 44,
              onPressed: provider.integerAnswer.trim().isEmpty ? null : provider.handleIntegerSubmit,
            ),
          ],
        ),
      ],
    );
  }
}

// ─── Post answer section ──────────────────────────────────────────────────────
class _PostAnswerSection extends StatelessWidget {
  final Question q;
  final QuestionViewerProvider provider;
  final GlobalKey solutionKey;
  final VoidCallback onSolutionReady;

  const _PostAnswerSection({
    required this.q,
    required this.provider,
    required this.solutionKey,
    required this.onSolutionReady,
  });

  @override
  Widget build(BuildContext context) {
    if (provider.isCurrentRestricted) {
      return _LockedSolutionCard(provider: provider);
    }

    return _SolutionCard(
      q: q,
      provider: provider,
      solutionKey: solutionKey,
      onReady: onSolutionReady,
    );
  }
}

// ─── Locked solution card ─────────────────────────────────────────────────────
class _LockedSolutionCard extends StatelessWidget {
  final QuestionViewerProvider provider;
  const _LockedSolutionCard({required this.provider});

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    final buddy = kAiBuddies[provider.solutionBuddyId] ?? kAiBuddies[kDefaultBuddyId]!;

    return DCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundImage: CachedNetworkImageProvider(buddy.imageUrl),
                    backgroundColor: c.lineDefault,
                  ),
                  Positioned(
                    bottom: -2, right: -2,
                    child: Container(
                      width: 18, height: 18,
                      decoration: BoxDecoration(
                        color: c.surface, shape: BoxShape.circle,
                        border: Border.all(color: c.lineDefault),
                      ),
                      child: Icon(Icons.lock, size: 10, color: c.fgMuted),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text('AI Solution Locked', style: DropperText.title(color: c.fg)),
                        const SizedBox(width: 8),
                        DTag('Limit reached', tone: DTagTone.warning),
                      ],
                    ),
                    Text('Mentor: ${buddy.name}', style: DropperText.meta(color: c.fgMuted)),
                  ],
                ),
              ),
              DTag('5/5 free questions used'),
            ],
          ),

          const SizedBox(height: 20),

          // Blurred teaser
          Stack(
            children: [
              // Blurred content
              Opacity(
                opacity: 0.15,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: c.sunken, borderRadius: DropperRadius.controlBR,
                  ),
                  child: Column(
                    children: List.generate(5, (i) => Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      height: 12,
                      decoration: BoxDecoration(
                        color: c.fg,
                        borderRadius: DropperRadius.controlBR,
                      ),
                      width: i == 4 ? 180 : double.infinity,
                    )),
                  ),
                ),
              ),
              // Lock overlay
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    color: c.surface.withValues(alpha: 0.9),
                    borderRadius: DropperRadius.controlBR,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 56, height: 56,
                        decoration: BoxDecoration(
                          color: c.sunken, shape: BoxShape.circle,
                          border: Border.all(color: c.lineDefault, width: 2),
                        ),
                        child: Icon(Icons.lock_outline, size: 24, color: c.actionPrimary),
                      ),
                      const SizedBox(height: 12),
                      Text('Free daily limit reached (5/5)',
                          style: DropperText.title(color: c.fg)),
                      const SizedBox(height: 6),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        child: Text(
                          'Get Rookie Pass for unlimited AI explanations.',
                          style: DropperText.bodySm(color: c.fgMuted),
                          textAlign: TextAlign.center,
                        ),
                      ),
                      const SizedBox(height: 20),
                      DButton(
                        label: 'Unlock with Rookie Pass',
                        iconEnd: const Icon(Icons.arrow_forward),
                        height: 44,
                        onPressed: provider.openPassModal,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.auto_awesome, size: 13, color: c.actionPrimary),
                  const SizedBox(width: 4),
                  Text('Unlimited AI explanations for every JEE question',
                      style: DropperText.meta(color: c.fgMuted)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text('Daily limit resets at 12:00 AM',
              style: DropperText.meta(color: c.fgMuted)),
        ],
      ),
    );
  }
}

// ─── Solution card ────────────────────────────────────────────────────────────
class _SolutionCard extends StatelessWidget {
  final Question q;
  final QuestionViewerProvider provider;
  final GlobalKey solutionKey;
  final VoidCallback onReady;

  const _SolutionCard({
    required this.q,
    required this.provider,
    required this.solutionKey,
    required this.onReady,
  });

  @override
  Widget build(BuildContext context) {
    final c     = context.dc;
    final buddy = kAiBuddies[provider.solutionBuddyId] ?? kAiBuddies[kDefaultBuddyId]!;

    if (provider.solutionStatus == SolutionStatus.loading) {
      WidgetsBinding.instance.addPostFrameCallback((_) => onReady());
    }

    return DCard(
      key: solutionKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundImage: CachedNetworkImageProvider(buddy.imageUrl),
                backgroundColor: c.lineDefault,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Solution', style: DropperText.title(color: c.fg)),
                    Text('Explained by ${buddy.name}',
                        style: DropperText.meta(color: c.fgMuted)),
                  ],
                ),
              ),
              // Regenerate button
              GestureDetector(
                onTap: () {/* TODO: regenerate */},
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: c.sunken, borderRadius: DropperRadius.controlBR,
                  ),
                  child: Icon(Icons.refresh, size: 16, color: c.fgMuted),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Solution content
          if (provider.solutionStatus == SolutionStatus.loading) ...[
            Column(
              children: [
                Row(children: [DSpinner(size: 16), const SizedBox(width: 10), Text('Generating solution…', style: DropperText.bodySm(color: c.fgMuted))]),
                const SizedBox(height: 12),
                ...List.generate(4, (_) => Padding(padding: const EdgeInsets.only(bottom: 8), child: DSkeleton(height: 12))),
              ],
            ),
          ] else if (provider.solution.isNotEmpty) ...[
            DSunkenCard(
              padding: const EdgeInsets.all(16),
              child: LatexText(
                text: provider.solution,
                style: DropperText.body(color: c.fg),
              ),
            ),
            const SizedBox(height: 16),
            // "Explain simpler" button
            DButton(
              label: provider.aiFollowupLoading ? 'Thinking…' : 'Explain simpler',
              variant: DButtonVariant.secondary,
              iconStart: const Icon(Icons.lightbulb_outline),
              loading: provider.aiFollowupLoading,
              height: 36,
              onPressed: provider.handleAiFollowup,
            ),
            if (provider.aiFollowup != null) ...[
              const SizedBox(height: 12),
              DSunkenCard(
                child: LatexText(
                  text: provider.aiFollowup!,
                  style: DropperText.bodySm(color: c.fg),
                ),
              ),
            ],
          ] else ...[
            DSunkenCard(
              child: Text('Could not load solution. Tap regenerate to try again.',
                  style: DropperText.bodySm(color: c.fgMuted)),
            ),
          ],
        ],
      ),
    );
  }
}

// ─── Bottom navigation bar ────────────────────────────────────────────────────
class _BottomNav extends StatelessWidget {
  final QuestionViewerProvider provider;
  const _BottomNav({required this.provider});

  @override
  Widget build(BuildContext context) {
    final c    = context.dc;
    final atFirst = provider.globalIndex <= 0;
    final atLast  = provider.globalIndex >= (provider.totalCount > 0 ? provider.totalCount - 1 : provider.questions.length - 1);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: DropperSpace.gutter, vertical: 12),
      decoration: BoxDecoration(
        color: c.surface.withValues(alpha: 0.92),
        border: Border(top: BorderSide(color: c.lineDefault)),
      ),
      child: Row(
        children: [
          // Previous
          DButton(
            variant: DButtonVariant.neutral,
            iconStart: const Icon(Icons.chevron_left),
            label: 'Previous',
            height: 40,
            onPressed: atFirst ? null : () => provider.goTo(-1),
          ),
          const Spacer(),
          // Q indicator
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: c.sunken,
              borderRadius: DropperRadius.controlBR,
            ),
            child: Text(
              'Q ${provider.globalIndex + 1}',
              style: DropperText.label(color: c.fg),
            ),
          ),
          const Spacer(),
          // Next
          DButton(
            iconEnd: const Icon(Icons.chevron_right),
            label: 'Next',
            height: 40,
            onPressed: atLast ? null : () => provider.goTo(1),
          ),
        ],
      ),
    );
  }
}

// ─── Pass modal sheet ─────────────────────────────────────────────────────────
class _PassModalSheet extends StatelessWidget {
  final QuestionViewerProvider provider;
  const _PassModalSheet({required this.provider});

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    return Padding(
      padding: const EdgeInsets.all(DropperSpace.card),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Daily free limit reached (5/5)',
              style: DropperText.title(color: c.fg)),
          const SizedBox(height: 6),
          Text(
            'You\'ve used your 5 free AI solutions for today. Get Rookie Pass for unlimited explanations and full JEE Advanced access.',
            style: DropperText.bodySm(color: c.fgMuted),
          ),
          const SizedBox(height: 20),
          // Pass card
          Container(
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
                    Text('Rookie Pass', style: DropperText.label(color: Colors.white).copyWith(fontWeight: FontWeight.w700)),
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
                const SizedBox(height: 14),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text('₹999', style: DropperText.price(color: Colors.white).copyWith(fontSize: 32)),
                    const SizedBox(width: 6),
                    Text('/ year', style: DropperText.bodySm(color: Colors.white.withValues(alpha: 0.6))),
                  ],
                ),
                const SizedBox(height: 4),
                Text('Just ₹83 a month.', style: DropperText.bodySm(color: Colors.white.withValues(alpha: 0.7))),
                const SizedBox(height: 14),
                ...['Unlimited AI solutions', 'JEE Advanced access', 'Hover to understand equations',
                    'Full PYQ mock shifts'].map((p) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      Icon(Icons.check, size: 14, color: DropperPalette.marigold300),
                      const SizedBox(width: 8),
                      Text(p, style: DropperText.bodySm(color: Colors.white.withValues(alpha: 0.9))),
                    ],
                  ),
                )),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      provider.onPassSuccess();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: DropperPalette.navy800,
                      minimumSize: const Size(double.infinity, 44),
                      shape: RoundedRectangleBorder(borderRadius: DropperRadius.controlBR),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('Unlock with Rookie Pass',
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
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.shield_outlined, size: 14, color: c.fgMuted),
                  const SizedBox(width: 4),
                  Text('Secure checkout', style: DropperText.meta(color: c.fgMuted)),
                ],
              ),
              TextButton(
                onPressed: () { Navigator.pop(context); provider.dismissPassModal(); },
                child: Text('Maybe later', style: DropperText.label(color: c.fgMuted)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ─── Buddy Selector Sheet (Question viewer) ───────────────────────────────────
class _BuddySelectorSheet extends StatelessWidget {
  final QuestionViewerProvider provider;
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
            final active = provider.buddyId == e.key;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: GestureDetector(
                onTap: () {
                  provider.changeBuddy(e.key);
                  Navigator.pop(context);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: active ? c.actionSecondary : c.sunken,
                    borderRadius: DropperRadius.controlBR,
                    border: Border.all(color: active ? c.actionPrimary : c.lineDefault),
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
        ],
      ),
    );
  }
}
