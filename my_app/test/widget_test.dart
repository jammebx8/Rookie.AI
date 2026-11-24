// widget_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:rookie_ai/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const RookieApp());
    expect(find.byType(RookieApp), findsOneWidget);
  });
}
