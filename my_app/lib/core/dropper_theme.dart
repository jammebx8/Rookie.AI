// dropper_theme.dart
// Dropper Design System tokens translated to Flutter
// Mirrors dropper/tokens/tokens.ts exactly

import 'package:flutter/material.dart';

// ─── Palette ─────────────────────────────────────────────────────────────────
class DropperPalette {
  // Sky — brand blue
  static const sky50  = Color(0xFFF3F9FF);
  static const sky100 = Color(0xFFE3F1FF);
  static const sky200 = Color(0xFFC9E5FF);
  static const sky300 = Color(0xFFA3D4FF);
  static const sky400 = Color(0xFF85C3FE);
  static const sky500 = Color(0xFF65B1FC);
  static const sky600 = Color(0xFF3D8FE0);
  static const sky700 = Color(0xFF2A6FB5);
  static const sky800 = Color(0xFF1D4F86);
  static const sky900 = Color(0xFF163A60);

  // Mint — right answers, success
  static const mint50  = Color(0xFFF0FBF5);
  static const mint100 = Color(0xFFDCF5E7);
  static const mint200 = Color(0xFFB6EACD);
  static const mint300 = Color(0xFF86DBAE);
  static const mint400 = Color(0xFF4FC787);
  static const mint500 = Color(0xFF22A865);
  static const mint600 = Color(0xFF178A51);
  static const mint700 = Color(0xFF126E41);

  // Red — wrong answers, errors
  static const red50  = Color(0xFFFDF4F3);
  static const red100 = Color(0xFFFDECEA);
  static const red200 = Color(0xFFF7CDC8);
  static const red300 = Color(0xFFE7A39B);
  static const red400 = Color(0xFFE2766A);
  static const red500 = Color(0xFFD9473A);
  static const red600 = Color(0xFFB2382D);

  // Marigold — celebration, marked
  static const marigold50  = Color(0xFFFFFBEA);
  static const marigold100 = Color(0xFFFFF3C4);
  static const marigold200 = Color(0xFFFFE68A);
  static const marigold300 = Color(0xFFFFD84D);
  static const marigold400 = Color(0xFFFFCE00);
  static const marigold500 = Color(0xFFFDBA12);
  static const marigold600 = Color(0xFFD69600);
  static const marigold800 = Color(0xFF6B4A00);

  // Gray — light UI
  static const gray0   = Color(0xFFFFFFFF);
  static const gray25  = Color(0xFFFBFBFA);
  static const gray50  = Color(0xFFF8F8F7);
  static const gray100 = Color(0xFFF1F1EF);
  static const gray150 = Color(0xFFECEBE8);
  static const gray200 = Color(0xFFE6E4E0);
  static const gray300 = Color(0xFFBDB6AD);
  static const gray400 = Color(0xFF8F8A85);
  static const gray500 = Color(0xFF736D68);
  static const gray600 = Color(0xFF625D59);
  static const gray700 = Color(0xFF55514E);
  static const gray800 = Color(0xFF3D3A38);
  static const gray900 = Color(0xFF2E2E2E);
  static const gray950 = Color(0xFF23272B);

  // Night — dark UI
  static const night950 = Color(0xFF0E0F12);
  static const night900 = Color(0xFF121417);
  static const night850 = Color(0xFF16181C);
  static const night800 = Color(0xFF1B1E22);
  static const night750 = Color(0xFF24272C);
  static const night700 = Color(0xFF2A2E34);
  static const night400 = Color(0xFF868C97);
  static const night200 = Color(0xFFB6BBC5);
  static const night50  = Color(0xFFF3F5FA);

  // Navy — Pass & stage
  static const navy950 = Color(0xFF0B1430);
  static const navy900 = Color(0xFF0D1736);
  static const navy850 = Color(0xFF0F1D45);
  static const navy800 = Color(0xFF14295F);
  static const navy700 = Color(0xFF1B3A8A);
  static const navy600 = Color(0xFF2F6FE0);

  // Coral — sale
  static const coral400 = Color(0xFFFF7A3D);
  static const coral500 = Color(0xFFFF4F7B);
}

// ─── Semantic tokens ──────────────────────────────────────────────────────────
class DropperColors {
  final Brightness brightness;
  const DropperColors._(this.brightness);

  static const light = DropperColors._(Brightness.light);
  static const dark  = DropperColors._(Brightness.dark);

  bool get isDark => brightness == Brightness.dark;

  // Surfaces
  Color get canvas   => isDark ? DropperPalette.night850 : DropperPalette.gray50;
  Color get base     => isDark ? DropperPalette.night900 : DropperPalette.gray0;
  Color get surface  => isDark ? DropperPalette.night800 : DropperPalette.gray0;
  Color get raised   => isDark ? DropperPalette.night800 : DropperPalette.gray0;
  Color get sunken   => isDark ? DropperPalette.night850 : DropperPalette.gray50;
  Color get inverse  => isDark ? DropperPalette.night50  : DropperPalette.gray900;

  // Text
  Color get fg        => isDark ? DropperPalette.night50  : DropperPalette.gray900;
  Color get fgSecond  => isDark ? DropperPalette.night200 : DropperPalette.gray700;
  Color get fgMuted   => isDark ? DropperPalette.night400 : DropperPalette.gray500;
  Color get fgInverse => isDark ? DropperPalette.night900 : DropperPalette.gray0;
  Color get link      => isDark ? DropperPalette.sky300   : DropperPalette.sky700;

  // Borders
  Color get lineSubtle => isDark ? const Color(0x0FFFFFFF) : const Color(0x0D000000);
  Color get lineDefault => isDark ? const Color(0x14FFFFFF) : DropperPalette.gray150;
  Color get lineStrong  => isDark ? const Color(0x1FFFFFFF) : DropperPalette.gray200;
  Color get lineFocus   => isDark ? DropperPalette.sky300   : DropperPalette.sky600;

  // Actions
  Color get actionPrimary      => isDark ? DropperPalette.sky300 : DropperPalette.sky700;
  Color get actionPrimaryHover => isDark ? DropperPalette.sky200 : DropperPalette.sky800;
  Color get onPrimary          => isDark ? DropperPalette.night900 : DropperPalette.gray0;
  Color get actionSecondary      => isDark ? const Color(0x23A3D4FF) : DropperPalette.sky100;
  Color get actionSecondaryHover => isDark ? const Color(0x38A3D4FF) : DropperPalette.sky200;
  Color get onSecondary          => isDark ? DropperPalette.sky200 : DropperPalette.sky800;
  Color get actionNeutral        => isDark ? DropperPalette.night750 : DropperPalette.gray100;
  Color get actionNeutralHover   => isDark ? DropperPalette.night700 : DropperPalette.gray150;

  // Feedback
  Color get success        => isDark ? DropperPalette.mint300 : DropperPalette.mint600;
  Color get successSurface => isDark ? const Color(0x1F86DBAE) : DropperPalette.mint100;
  Color get successBorder  => isDark ? const Color(0x5986DBAE) : DropperPalette.mint400;
  Color get danger         => isDark ? const Color(0xFFFF7A66) : DropperPalette.red500;
  Color get dangerSurface  => isDark ? const Color(0x1FFF7A66) : DropperPalette.red100;
  Color get dangerBorder   => isDark ? const Color(0x59FF7A66) : DropperPalette.red300;
  Color get dangerText     => isDark ? const Color(0xFFFF9C8C) : DropperPalette.red600;
  Color get warning        => isDark ? DropperPalette.marigold300 : DropperPalette.marigold600;
  Color get warningSurface => isDark ? const Color(0x1FFFD84D) : DropperPalette.marigold100;
  Color get warningText    => isDark ? DropperPalette.marigold200 : DropperPalette.marigold800;
}

// ─── Radius ───────────────────────────────────────────────────────────────────
class DropperRadius {
  static const double tag     = 6;
  static const double control = 8;
  static const double card    = 16;
  static const double round   = 9999;

  static BorderRadius tagBR     = BorderRadius.circular(tag);
  static BorderRadius controlBR = BorderRadius.circular(control);
  static BorderRadius cardBR    = BorderRadius.circular(card);
  static BorderRadius roundBR   = BorderRadius.circular(round);
}

// ─── Spacing ─────────────────────────────────────────────────────────────────
class DropperSpace {
  static const double inline_   = 6;   // icon ↔ label
  static const double inlineLg  = 12;  // between inline items
  static const double stackXs   = 8;   // list rows, chips
  static const double stack     = 16;  // between cards / blocks
  static const double stackLg   = 24;  // between groups
  static const double card      = 24;  // card padding
  static const double cardLg    = 32;  // feature card padding
  static const double control   = 16;  // button/input h-pad
  static const double gutter    = 16;  // page side padding
  static const double gutterLg  = 24;
  static const double sectionSm = 40;
  static const double section   = 56;
}

// ─── Typography ───────────────────────────────────────────────────────────────
class DropperText {
  static TextStyle _base({
    required double size,
    required double height,
    required double letterSpacing,
    required FontWeight weight,
    Color? color,
  }) =>
      TextStyle(
        fontFamilyFallback: const ['Roboto', 'sans-serif'],
        fontSize: size,
        height: height,
        letterSpacing: letterSpacing,
        fontWeight: weight,
        color: color,
      );

  // font size in px (base 14px root → scale ×14 from rem)
  static const double _root = 14.0;
  static double rem(double r) => r * _root;

  static TextStyle price({Color? color})    => _base(size: rem(3.2),  height: 1,    letterSpacing: rem(3.2)  * -0.05, weight: FontWeight.w700, color: color);
  static TextStyle display({Color? color})  => _base(size: rem(2.6),  height: 1.05, letterSpacing: rem(2.6)  * -0.035, weight: FontWeight.w700, color: color);
  static TextStyle value_({Color? color})   => _base(size: rem(2.4),  height: 1,    letterSpacing: rem(2.4)  * -0.045, weight: FontWeight.w700, color: color);
  static TextStyle heading({Color? color})  => _base(size: rem(1.35), height: 1.25, letterSpacing: rem(1.35) * -0.02,  weight: FontWeight.w600, color: color);
  static TextStyle title({Color? color})    => _base(size: rem(1.2),  height: 1.3,  letterSpacing: rem(1.2)  * -0.015, weight: FontWeight.w600, color: color);
  static TextStyle bodyLg({Color? color})   => _base(size: rem(1.15), height: 1.6,  letterSpacing: 0,                  weight: FontWeight.w500, color: color);
  static TextStyle body({Color? color})     => _base(size: rem(1.0),  height: 1.55, letterSpacing: 0,                  weight: FontWeight.w400, color: color);
  static TextStyle bodySm({Color? color})   => _base(size: rem(0.9),  height: 1.5,  letterSpacing: 0,                  weight: FontWeight.w400, color: color);
  static TextStyle label({Color? color})    => _base(size: rem(0.85), height: 1.4,  letterSpacing: 0,                  weight: FontWeight.w500, color: color);
  static TextStyle meta({Color? color})     => _base(size: rem(0.8),  height: 1.4,  letterSpacing: 0,                  weight: FontWeight.w500, color: color);
  static TextStyle caption({Color? color})  => _base(size: rem(0.75), height: 1.35, letterSpacing: rem(0.75) * 0.01,   weight: FontWeight.w600, color: color);
}

// ─── Gradients ────────────────────────────────────────────────────────────────
class DropperGradients {
  static const passGradient = LinearGradient(
    begin: Alignment.topRight,
    end: Alignment.bottomLeft,
    colors: [Color(0xFF2F6FE0), Color(0xFF1B3A8A), Color(0xFF0D1736)],
    stops: [0.0, 0.48, 1.0],
  );

  static const saleGradient = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [Color(0xFFFF4F7B), Color(0xFFFF7A3D)],
  );
}

// ─── Material ThemeData ───────────────────────────────────────────────────────
ThemeData dropperTheme({bool dark = false}) {
  final c = dark ? DropperColors.dark : DropperColors.light;

  return ThemeData(
    brightness: dark ? Brightness.dark : Brightness.light,
    useMaterial3: true,
    scaffoldBackgroundColor: c.canvas,
    cardColor: c.surface,
    dividerColor: Colors.transparent,
    colorScheme: ColorScheme(
      brightness: dark ? Brightness.dark : Brightness.light,
      primary: c.actionPrimary,
      onPrimary: c.onPrimary,
      secondary: c.actionSecondary,
      onSecondary: c.onSecondary,
      error: c.danger,
      onError: c.onPrimary,
      surface: c.surface,
      onSurface: c.fg,
    ),
    textTheme: TextTheme(
      displayLarge: DropperText.display(color: c.fg),
      headlineMedium: DropperText.heading(color: c.fg),
      titleLarge: DropperText.title(color: c.fg),
      bodyLarge: DropperText.bodyLg(color: c.fg),
      bodyMedium: DropperText.body(color: c.fg),
      bodySmall: DropperText.bodySm(color: c.fgMuted),
      labelLarge: DropperText.label(color: c.fg),
      labelSmall: DropperText.caption(color: c.fgMuted),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: c.surface.withValues(alpha: 0.92),
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      titleTextStyle: DropperText.body(color: c.fg).copyWith(fontWeight: FontWeight.w600),
      iconTheme: IconThemeData(color: c.fgMuted, size: 20),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: c.actionPrimary,
        foregroundColor: c.onPrimary,
        textStyle: DropperText.label(color: c.onPrimary),
        shape: RoundedRectangleBorder(borderRadius: DropperRadius.controlBR),
        minimumSize: const Size(0, 40),
        padding: const EdgeInsets.symmetric(horizontal: DropperSpace.control, vertical: 0),
        elevation: 0,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: c.fg,
        side: BorderSide(color: c.lineDefault),
        textStyle: DropperText.label(color: c.fg),
        shape: RoundedRectangleBorder(borderRadius: DropperRadius.controlBR),
        minimumSize: const Size(0, 40),
        padding: const EdgeInsets.symmetric(horizontal: DropperSpace.control, vertical: 0),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: c.sunken,
      border: OutlineInputBorder(
        borderRadius: DropperRadius.controlBR,
        borderSide: BorderSide(color: c.lineDefault),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: DropperRadius.controlBR,
        borderSide: BorderSide(color: c.lineDefault),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: DropperRadius.controlBR,
        borderSide: BorderSide(color: c.lineFocus, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      hintStyle: DropperText.body(color: c.fgMuted),
    ),
  );
}
