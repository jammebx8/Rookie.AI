// latex_renderer.dart
// Renders mixed text + LaTeX ($…$ and $$…$$) using flutter_math_fork
// Mirrors renderContent.tsx behaviour

import 'package:flutter/material.dart';
import 'package:flutter_math_fork/flutter_math.dart';
import 'package:rookie_ai/core/dropper_theme.dart';

extension BuildContextX2 on BuildContext {
  bool get isDarkMode => Theme.of(this).brightness == Brightness.dark;
}

class LatexText extends StatelessWidget {
  final String text;
  final TextStyle? style;
  final bool softWrap;

  const LatexText({super.key, required this.text, this.style, this.softWrap = true});

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).brightness == Brightness.dark ? DropperColors.dark : DropperColors.light;
    final baseStyle = style ?? DropperText.bodyLg(color: c.fg);

    if (!text.contains(r'$')) {
      return Text(text, style: baseStyle, softWrap: softWrap);
    }

    final spans = _parseLatex(text, baseStyle, c);

    return RichText(
      text: TextSpan(children: spans),
      softWrap: softWrap,
    );
  }

  List<InlineSpan> _parseLatex(String input, TextStyle base, DropperColors c) {
    final result = <InlineSpan>[];
    // Tokenise: $$...$$ then $...$
    final regex = RegExp(r'(\$\$[\s\S]+?\$\$|\$[^\n$]+?\$)');
    int last = 0;

    for (final match in regex.allMatches(input)) {
      if (match.start > last) {
        result.add(TextSpan(text: input.substring(last, match.start), style: base));
      }
      final raw = match.group(0)!;
      final isDisplay = raw.startsWith(r'$$');
      final inner = isDisplay ? raw.substring(2, raw.length - 2).trim() : raw.substring(1, raw.length - 1).trim();

      result.add(WidgetSpan(
        alignment: PlaceholderAlignment.middle,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 1),
          child: Math.tex(
            inner,
            mathStyle: isDisplay ? MathStyle.display : MathStyle.text,
            textStyle: base.copyWith(fontSize: (base.fontSize ?? 14) * 0.95),
            onErrorFallback: (e) => Text(raw, style: base.copyWith(color: c.danger)),
          ),
        ),
      ));
      last = match.end;
    }

    if (last < input.length) {
      result.add(TextSpan(text: input.substring(last), style: base));
    }
    return result;
  }
}
