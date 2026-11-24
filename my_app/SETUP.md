# Rookie.AI Flutter App — Setup Guide

## Prerequisites
- Flutter SDK ≥ 3.5.0
- Android Studio / VS Code with Flutter extension
- An Android device or emulator (API 21+)

## 1. Connect Supabase

Open `lib/core/supabase_client.dart` and replace the placeholder values:

```dart
const kSupabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co';
const kSupabaseAnonKey = 'YOUR_ANON_KEY';
```

These values are your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the web app.

Then in `lib/main.dart`, uncomment this line:

```dart
await initSupabase();
```

## 2. Fonts (optional but recommended)

Download Open Sauce Two from https://github.com/marcologous/Open-Sauce-Fonts and place:
- `OpenSauceTwo-Regular.ttf`
- `OpenSauceTwo-Medium.ttf`
- `OpenSauceTwo-SemiBold.ttf`
- `OpenSauceTwo-Bold.ttf`

in `assets/fonts/`. The app falls back to system sans-serif if these are missing.

## 3. Run

```bash
flutter pub get
flutter run
```

## Project Structure

```
lib/
├── core/
│   ├── dropper_theme.dart       # Dropper design system tokens (mirrors tokens.ts)
│   ├── constants.dart           # App constants + AI buddy definitions
│   ├── models.dart              # Question, RookieUser, StreakData
│   └── supabase_client.dart     # Supabase client init
├── features/
│   ├── home/
│   │   ├── home_screen.dart     # Home page (mirrors app/(tabs)/home/page.tsx)
│   │   └── home_provider.dart   # Home state + data
│   └── question_viewer/
│       ├── question_viewer_screen.dart   # Question viewer (mirrors QuestionViewerClient.tsx)
│       └── question_viewer_provider.dart # All question solving state + logic
├── shared/widgets/
│   ├── dropper_widgets.dart     # DCard, DTag, DButton, DOmrOption, DSkeleton, etc.
│   └── latex_renderer.dart      # LaTeX/math rendering via flutter_math_fork
└── main.dart                    # App entry point + routing
```

## Features implemented

### Home Page
- Greeting + motivational line (rotates daily)
- AI Buddy message card (matches selected buddy)
- 4 metric cards: Streak, Today vs goal, Longest streak, This month
- Week strip (M T W T F S S dots)
- Daily goal picker (preset + custom)
- Recommended question card — fully interactive MCQ solving
- Rookie Pass banner (navy gradient, same as web)
- Buddy selector bottom sheet
- Dark/light mode (system)

### Question Viewer
- Full MCQ + Integer question solving
- LaTeX rendering for question text and options
- AI solution generation (same backend as web)
- 5-question daily free limit — exact logic from QuestionViewerClient.tsx
- Locked solution card when limit reached
- Rookie Pass modal (opens from locked card)
- AI "explain simpler" follow-up
- Bookmark toggle (localStorage equivalent via SharedPreferences)
- 6 AI buddies — Jeetu Bhaiya, Riya, Rei, Ritu, Shreya, Neha
- Buddy selector
- Timer (live countdown on each question)
- Prev/Next navigation with windowed loading
- Session restore (answers persist across app restarts)
- Auto-bookmark wrong answers
- Coins system
- Animated entrance transitions (flutter_animate)

## Daily limit logic
Matches the web app exactly:
- Stored in SharedPreferences under `questionsToday_YYYY-M-D`
- Synced with Supabase `attempts` table on mount (takes the higher value)
- After 5 attempts/day: solution locked, Rookie Pass modal shown once
- After 5th (last free) question: modal shown with 1.5s delay
- `hasPass = true` bypasses all restrictions
