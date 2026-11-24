// dropper_widgets.dart
// Dropper component library for Flutter
// Mirrors dropper/components/ — Card, Tag, Button, OmrOption, Spinner, Skeleton, etc.

import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import 'package:rookie_ai/core/dropper_theme.dart';

extension BuildContextX on BuildContext {
  DropperColors get dc =>
      Theme.of(this).brightness == Brightness.dark ? DropperColors.dark : DropperColors.light;
  bool get isDark => Theme.of(this).brightness == Brightness.dark;
}

// ─── DCard ────────────────────────────────────────────────────────────────────
class DCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final Color? color;
  final BorderRadius? borderRadius;
  final bool interactive;

  const DCard({
    super.key,
    required this.child,
    this.padding,
    this.color,
    this.borderRadius,
    this.interactive = false,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      decoration: BoxDecoration(
        color: color ?? c.surface,
        borderRadius: borderRadius ?? DropperRadius.cardBR,
        border: Border.all(color: c.lineSubtle, width: 1),
      ),
      padding: padding ?? const EdgeInsets.all(DropperSpace.card),
      child: child,
    );
  }
}

// ─── DSunkenCard ─────────────────────────────────────────────────────────────
class DSunkenCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;

  const DSunkenCard({super.key, required this.child, this.padding});

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    return Container(
      decoration: BoxDecoration(
        color: c.sunken,
        borderRadius: DropperRadius.controlBR,
        border: Border.all(color: c.lineDefault),
      ),
      padding: padding ?? const EdgeInsets.all(12),
      child: child,
    );
  }
}

// ─── DTag ─────────────────────────────────────────────────────────────────────
enum DTagTone { neutral, info, success, danger, warning, pass, sale }

class DTag extends StatelessWidget {
  final String text;
  final DTagTone tone;
  final Widget? icon;

  const DTag(this.text, {super.key, this.tone = DTagTone.neutral, this.icon});

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    final (bg, fg) = switch (tone) {
      DTagTone.success => (c.successSurface, c.success),
      DTagTone.danger  => (c.dangerSurface,  c.danger),
      DTagTone.warning => (c.warningSurface, c.warning),
      DTagTone.info    => (c.actionSecondary, c.actionPrimary),
      DTagTone.pass    => (DropperPalette.navy700, Colors.white),
      DTagTone.sale    => (DropperPalette.coral500, Colors.white),
      _                => (c.sunken, c.fgMuted),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: DropperRadius.tagBR),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            IconTheme(data: IconThemeData(color: fg, size: 11), child: icon!),
            const SizedBox(width: 4),
          ],
          Text(text,
              style: DropperText.caption(color: fg)),
        ],
      ),
    );
  }
}

// ─── DButton ─────────────────────────────────────────────────────────────────
enum DButtonVariant { primary, secondary, neutral, ghost, outline, danger, inverse }

class DButton extends StatelessWidget {
  final String? label;
  final Widget? child;
  final VoidCallback? onPressed;
  final DButtonVariant variant;
  final bool loading;
  final Widget? iconStart;
  final Widget? iconEnd;
  final double height;
  final EdgeInsetsGeometry? padding;

  const DButton({
    super.key,
    this.label,
    this.child,
    this.onPressed,
    this.variant = DButtonVariant.primary,
    this.loading = false,
    this.iconStart,
    this.iconEnd,
    this.height = 40,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    final (bg, fg, border) = switch (variant) {
      DButtonVariant.primary   => (c.actionPrimary, c.onPrimary, Colors.transparent),
      DButtonVariant.secondary => (c.actionSecondary, c.onSecondary, Colors.transparent),
      DButtonVariant.neutral   => (c.actionNeutral, c.fg, Colors.transparent),
      DButtonVariant.ghost     => (Colors.transparent, c.fg, Colors.transparent),
      DButtonVariant.outline   => (Colors.transparent, c.fg, c.lineDefault),
      DButtonVariant.danger    => (c.dangerSurface, c.danger, Colors.transparent),
      DButtonVariant.inverse   => (Colors.white, DropperPalette.navy800, Colors.transparent),
    };

    final content = loading
        ? SizedBox(
            height: 16, width: 16,
            child: CircularProgressIndicator(strokeWidth: 2, color: fg),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (iconStart != null) ...[
                IconTheme(data: IconThemeData(color: fg, size: 16), child: iconStart!),
                const SizedBox(width: DropperSpace.inline_),
              ],
              if (child != null) child!
              else Text(label ?? '', style: DropperText.label(color: fg)),
              if (iconEnd != null) ...[
                const SizedBox(width: DropperSpace.inline_),
                IconTheme(data: IconThemeData(color: fg, size: 16), child: iconEnd!),
              ],
            ],
          );

    return SizedBox(
      height: height,
      child: Material(
        color: bg,
        borderRadius: DropperRadius.controlBR,
        child: InkWell(
          onTap: loading ? null : onPressed,
          borderRadius: DropperRadius.controlBR,
          child: Container(
            padding: padding ?? const EdgeInsets.symmetric(horizontal: DropperSpace.control),
            decoration: border == Colors.transparent
                ? null
                : BoxDecoration(
                    border: Border.all(color: border),
                    borderRadius: DropperRadius.controlBR,
                  ),
            alignment: Alignment.center,
            child: content,
          ),
        ),
      ),
    );
  }
}

// ─── DOmrOption ───────────────────────────────────────────────────────────────
enum OmrState { idle, selected, right, wrong }

class DOmrOption extends StatelessWidget {
  final String letter;
  final Widget child;
  final OmrState state;
  final VoidCallback? onTap;
  final bool disabled;

  const DOmrOption({
    super.key,
    required this.letter,
    required this.child,
    this.state = OmrState.idle,
    this.onTap,
    this.disabled = false,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.dc;

    final (bg, border, letterBg, letterFg) = switch (state) {
      OmrState.right    => (c.successSurface, c.successBorder,  c.success,       Colors.white),
      OmrState.wrong    => (c.dangerSurface,  c.dangerBorder,   c.danger,        Colors.white),
      OmrState.selected => (c.actionSecondary, c.lineFocus,     c.actionPrimary, Colors.white),
      OmrState.idle     => (c.sunken,         c.lineDefault,    c.sunken,        c.fgMuted),
    };

    return GestureDetector(
      onTap: disabled ? null : onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: DropperRadius.controlBR,
          border: Border.all(color: border, width: state == OmrState.idle ? 1 : 1.5),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        child: Row(
          children: [
            // Letter badge
            AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              width: 26,
              height: 26,
              decoration: BoxDecoration(
                color: state == OmrState.idle ? c.lineDefault : letterBg,
                borderRadius: DropperRadius.tagBR,
              ),
              alignment: Alignment.center,
              child: Text(
                letter,
                style: DropperText.caption(color: state == OmrState.idle ? c.fgMuted : letterFg),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(child: child),
          ],
        ),
      ),
    );
  }
}

// ─── DSkeleton ────────────────────────────────────────────────────────────────
class DSkeleton extends StatelessWidget {
  final double? width;
  final double height;
  final BorderRadius? borderRadius;

  const DSkeleton({super.key, this.width, this.height = 12, this.borderRadius});

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    return Shimmer.fromColors(
      baseColor: c.sunken,
      highlightColor: c.lineDefault,
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: c.lineDefault,
          borderRadius: borderRadius ?? DropperRadius.controlBR,
        ),
      ),
    );
  }
}

// ─── DSpinner ─────────────────────────────────────────────────────────────────
class DSpinner extends StatelessWidget {
  final double size;
  final Color? color;

  const DSpinner({super.key, this.size = 20, this.color});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size, height: size,
      child: CircularProgressIndicator(
        strokeWidth: 2,
        valueColor: AlwaysStoppedAnimation(color ?? context.dc.actionPrimary),
      ),
    );
  }
}

// ─── DBar (progress) ─────────────────────────────────────────────────────────
class DBar extends StatelessWidget {
  final double value; // 0–100
  final Color? color;

  const DBar({super.key, required this.value, this.color});

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    return ClipRRect(
      borderRadius: DropperRadius.roundBR,
      child: LinearProgressIndicator(
        value: (value / 100).clamp(0.0, 1.0),
        backgroundColor: c.lineDefault,
        valueColor: AlwaysStoppedAnimation(color ?? c.actionPrimary),
        minHeight: 6,
      ),
    );
  }
}

// ─── DRing (circular progress) ───────────────────────────────────────────────
class DRing extends StatelessWidget {
  final double value; // 0–100
  final double size;
  final double strokeWidth;
  final Widget? child;

  const DRing({
    super.key,
    required this.value,
    this.size = 80,
    this.strokeWidth = 7,
    this.child,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    return SizedBox(
      width: size, height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: size, height: size,
            child: CircularProgressIndicator(
              value: (value / 100).clamp(0.0, 1.0),
              strokeWidth: strokeWidth,
              backgroundColor: c.lineDefault,
              valueColor: AlwaysStoppedAnimation(c.actionPrimary),
              strokeCap: StrokeCap.round,
            ),
          ),
          if (child != null) child!,
        ],
      ),
    );
  }
}

// ─── DSection header ─────────────────────────────────────────────────────────
class DSectionHeader extends StatelessWidget {
  final String title;
  final Widget? action;

  const DSectionHeader({super.key, required this.title, this.action});

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Expanded(
            child: Text(title, style: DropperText.heading(color: c.fg)),
          ),
          if (action != null) action!,
        ],
      ),
    );
  }
}

// ─── DListRow ─────────────────────────────────────────────────────────────────
class DListRow extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? padding;

  const DListRow({super.key, required this.child, this.onTap, this.padding});

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    return Material(
      color: c.sunken,
      borderRadius: DropperRadius.controlBR,
      child: InkWell(
        onTap: onTap,
        borderRadius: DropperRadius.controlBR,
        child: Padding(
          padding: padding ?? const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: child,
        ),
      ),
    );
  }
}

// ─── DChip ────────────────────────────────────────────────────────────────────
class DChip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback? onTap;

  const DChip({super.key, required this.label, this.active = false, this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        height: 32,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: active ? c.actionSecondary : c.sunken,
          borderRadius: DropperRadius.controlBR,
          border: Border.all(
            color: active ? c.actionPrimary : c.lineDefault,
          ),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: DropperText.label(color: active ? c.onSecondary : c.fgMuted),
        ),
      ),
    );
  }
}

// ─── Empty State ─────────────────────────────────────────────────────────────
class DEmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Widget? action;

  const DEmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.action,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 32, color: c.fgMuted),
            const SizedBox(height: 16),
            Text(title, style: DropperText.title(color: c.fg), textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(subtitle, style: DropperText.bodySm(color: c.fgMuted), textAlign: TextAlign.center),
            if (action != null) ...[const SizedBox(height: 20), action!],
          ],
        ),
      ),
    );
  }
}

// ─── Metric Card ─────────────────────────────────────────────────────────────
class DMetricCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Widget value;
  final Widget? bottom;
  final Widget? action;

  const DMetricCard({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    this.bottom,
    this.action,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.dc;
    return DCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(icon, size: 15, color: c.fgMuted),
              const SizedBox(width: DropperSpace.inline_),
              Expanded(
                child: Text(label, style: DropperText.label(color: c.fgMuted)),
              ),
              if (action != null) action!,
            ],
          ),
          const SizedBox(height: 10),
          DefaultTextStyle(
            style: DropperText.value_(color: c.fg),
            child: value,
          ),
          if (bottom != null) ...[
            const Spacer(),
            const SizedBox(height: 16),
            bottom!,
          ],
        ],
      ),
    );
  }
}
