# Rookie (RookieAI): project context for the next AI

Read this before touching anything. It covers:
- what the product is
- what has already been built
- the decisions the owner made, and why
- what comes next

Last updated: 2026-11-13.

---

## 1. The product

**Rookie** (domain `rookieai.vercel.app`) is a web app for Indian students preparing for **JEE Main, JEE Advanced, NEET, MHT CET and BITSAT**. It offers:
- 10,000+ previous-year questions (PYQs), 2013–2026, every shift.
- AI solutions written in Hinglish by a "study buddy".
- Custom timed tests.
- Streaks, coins and a leaderboard.

**Users.** Class 11, Class 12 and droppers, mostly on phones and often studying late at night. They know OMR sheets, coaching culture (Kota) and Hinglish. Keep copy short and friendly, and use Hinglish lightly.

**Money.** There is a free tier with daily limits; one free custom test a day is enforced in `app/api/tests/create/route.ts:42`. The paid plan is the **Rookie Pass** at **₹399/year** (`rookie_pass_migration.sql` seed, `plans` table). Payment is Razorpay checkout inside the app.

**Stack.**
- Next.js 16.1.1 (App Router, Turbopack), React 19, TypeScript, Tailwind v4.
- Supabase (auth via Google OAuth, Postgres, RPCs). Firebase Analytics.
- Razorpay.
- A separate FastAPI backend at `rookie-backend.vercel.app`. It handles orders, the webhook and `/solution` AI calls. Its code is **not** in this repo, and the `rookie_backend/` and `rookie-dash/` folders are empty.

**Repos and paths on this machine.**
- Working repo: `~/Workspace/rookie-ai/repo`. Cloned from `https://github.com/jammebx8/Rookie.AI` and on branch `main`.
- Fresh download of the same repo: `~/Downloads/Rookie.AI-main`. Identical except that it lacks the redesign work below.
- Brand source files: `~/Desktop/Logo01.svg` (lockup for light backgrounds) and `~/Desktop/Logo02.svg` (lockup for dark backgrounds).
- Run locally: `cd ~/Workspace/rookie-ai/repo && npm run dev -- -p 3123`.
- A production build compiles and passes type-checking. It then fails at "collect page data" because `/api/razorpay/create-order` needs Supabase env vars that aren't in a local `.env`. That's pre-existing and unrelated to the landing work.

---

## 2. Git state: important

- **Everything is UNCOMMITTED on `main`.** The owner wants to review it locally first.
- **Do not commit or push** unless the owner says so.
- An earlier local branch, `redesign/landing-page`, was squash-moved onto `main` and then deleted. It was never pushed.
- GitHub has `main` and `voice-feature`. `voice-feature` belongs to someone else; don't touch it.

These files changed or are new relative to `main` (`728ab20 grant access feature v3`):

```
 M app/page.tsx              landing page (fully rewritten)
 M package.json / lock       + @fontsource/open-sauce-two
?? app/landing.css           landing styles (scoped under .rk)
?? app/_landing/tokens.css   pastel design system (primitives + roles + gradients)
?? app/_landing/motion.tsx   GSAP + ScrollTrigger motion, CountUp, RollingNumber, FaqItem
?? app/_landing/live.tsx     useLiveStudents (slowly-rising student counter)
?? app/_landing/PaperBackdrop.tsx  the original exam-paper sheets + formulas (static)
?? lib/design-tokens.ts      same palette as TS data (for the dashboard library)
?? public/brand/             rookie-lockup-on-light.svg, rookie-lockup-on-dark.svg, rookie-owl.png
?? DESIGN_SYSTEM.md          design-system rules
?? CONTEXT.md                this file
```

---

## 3. Brand and design system (already decided)

**Logo.** An owl in a sky-blue circle, plus the wordmark "Rookie".
- The owl is a 512px PNG embedded in the SVGs, extracted to `public/brand/rookie-owl.png`.
- The owl is also the AI study buddy ("Rookie, your study owl").
- Caveat: the owl looks like a stock flat icon (Flaticon-style). The owner was told to check the licence before using it as a trademark.

**Font.** **Open Sauce Two** (OFL), loaded via `@fontsource/open-sauce-two` at weights 400, 500, 600 and 700. Use it everywhere, dashboard included.

**Numbers.** Use Open Sauce Two for numbers too (numbering, metrics, counters). Geist Mono was tried for numbers and the owner rejected it as too much, so don't use a mono font.

**Icons.** **Lucide** (`lucide-react`, already installed). Use no other icon sets. The existing dashboard still uses `react-icons` and hand-drawn SVGs, and those should be replaced.

**Palette.** Extracted from the owl. Full scales are in `app/_landing/tokens.css` and `lib/design-tokens.ts`, and the rules are in `DESIGN_SYSTEM.md`.

| Family | Source | Key values |
|---|---|---|
| Sky | circle | 300 `#A3D4FF`, 500 `#65B1FC`, 700 `#2A6FB5` |
| Clay | feathers | 400 `#C38778`, 500 `#A65D4E`, 700 `#734338` |
| Marigold | beak | 400 `#FFCE00`, 500 `#FDBA12` |
| Mint | supporting (live/success only) | 300 `#86DBAE`, 500 `#22A865` |
| Ink | wordmark/pupil | 900 `#2E2E2E`, 950 `#23272B` |
| Night (dark mode) | — | bg `#121417`, card `#1B1E22`, text `#F3F5FA` |

**How the tokens are structured.**
- **Primitives** are named `--rk-<family>-<step>` and live on `:root`.
- **Roles** are defined per family: `--<family>-surface` (100), `-border` (200), `-solid` (300), `-strong` (500/600), `-ink` (800) and `-grad` (the 50→200→300 gradient).
- `data-tone="sky|clay|marigold|mint"` on any element exposes `--t-surface`, `--t-border`, `--t-solid`, `--t-strong`, `--t-ink` and `--t-grad`. One component style then works in every colour.
- Text on pastel uses `-ink`, which gives at least 7:1 contrast.
- In dark mode ("Night owl"), glyphs on pastel `-solid` fills must be dark (`--rk-night-900`), or they disappear. This bug was hit and fixed twice.

**Owner's hard rules.**
1. **Backgrounds are white `#FFFFFF` or a light neutral gray `#F8F8F7` (`--paper-2`) only.** The owner asked for this gray to be lighter than the original `#F6F6F5`. Colour goes on elements (cards, chips, badges), never on section backgrounds. The single exception is the footer, which uses a pastel brand gradient.
2. **Card groups form a single row.**
   - No 2×2 grids, and no 1×N vertical stacks of cards.
   - Desktop: cards sit side by side.
   - Mobile: the row becomes a horizontal swipe strip with scroll-snap (`.rk-row` in `landing.css`).
3. **Don't use bare divider lines** between list items or metrics. Either make each item a card or remove the lines. (The FAQ items and the metrics were changed to cards for this reason.)
4. **Copy should be light and easy to digest.** Keep each section to a heading, at most one line of support text, and the element.
5. **No movement in the paper-sheet background**: no cursor parallax, no float. It stays static.
6. **The live dot goes after the text** (`2,030 students ●`), everywhere.
7. **On mobile, a sticky "Continue with Google" bar appears once the user scrolls past the hero**, and stays hidden on the hero itself.
8. **Make small changes as targeted edits to existing work.** Don't rebuild from scratch.

**Motifs that resonate with the audience.**
- OMR bubbles for selection chips and answer options.
- The answer-sheet paper background: ruled lines and a red margin. The owner "spent a lot of time perfecting" it, so keep it.
- Red pen (`--pen #D9473A`) for underlines and "+4" marks.
- "Night owl mode" as the label for dark mode.
- Hinglish lines: "Ratto mat, samjho." and "Mehnat aapki, samjhaana humara."
- Pricing in rupees per month ("about ₹25 a month, less than a samosa and chai").

---

## 4. The landing page (`app/page.tsx`): done, awaiting review

**Sections, in order.**
1. Nav: owl lockup, Beta tag, links, Night-owl toggle, "Start free" button.
2. Hero:
   - Headline "Past papers, finally explained." with a red-pen underline.
   - One-line sub-heading.
   - Avatars plus the live student count.
   - Sign-up card: class and exam picked with OMR-style chips, then Continue with Google.
   - The static paper sheets sit behind it: **max 3 sheets** (`HERO_SET` in `PaperBackdrop.tsx`); the owner found more distracting. The "Ratto mat, samjho." badge was removed from the hero at the owner's request (the line stays in the closing section).
3. Stats: four pastel cards with GSAP count-up.
4. How it works: a sample PYQ sheet next to the owl's Hinglish explanation.
5. Students: one auto-scrolling testimonial rail. It eases to a stop on hover.
6. Why Rookie: four tall pastel-gradient tiles. They show icon and title at rest; the detail slides in on hover, focus or tap (`Tile` component).
7. Exams: five tall tiles (logo, subjects, conducting body), with the same reveal.
8. Pricing: Free ₹0 next to Rookie Pass ₹399/year.
9. FAQ: four card items with a GSAP height animation.
10. Closing: "At the end, it's all hard work." plus the Hinglish line and the paper sheets.
11. Footer: the pastel gradient band.
12. Mobile sticky Google button.

**Sign-in logic kept from the original, with fixes.**
- The class and exam picked before the OAuth redirect are saved in `sessionStorage` (`rk_pending_profile`) and restored afterwards. Previously they were lost.
- Supabase errors are now checked.
- Inline error messages replace `alert()`.
- The avatar query selects only `avatar_url`.

**Motion** lives in `app/_landing/motion.tsx`.
- Uses GSAP and ScrollTrigger: a hero intro timeline, the pen-underline draw, batched scroll reveals, count-ups, the odometer counter, the marquee and the FAQ animation.
- Respects `prefers-reduced-motion`.
- A `<noscript>` fallback un-hides the reveal targets.

**Known caveats the owner accepted.**
- **Testimonials are AI-written.** The owner chose to ship them for now. They were warned that Indian consumer rules on fake reviews (CCPA guidelines, BIS IS 19000:2022) treat these as risky, and that they should be swapped for real quotes.
- **The student counter is simulated.** It starts from `LIVE_STUDENTS_BASE = 2000` in `app/_landing/live.tsx`, adds a random offset, and ticks up by one every 9–30 seconds. Wiring it to a real count from a server route is recommended; don't read `users` with the anon key.
- **Terms and Privacy links point to `#`.** Real pages are needed, especially because the users are minors and the DPDP Act applies.
- **The favicon is still the old `app/icon.svg`.** It wasn't changed because `app/(tabs)/layout.tsx` also uses `/icon.svg`.

---

## 5. Next task: redesign the logged-in dashboard

**Status.** The study is complete (below). The plan has been proposed to the owner and is awaiting confirmation.
- The owner asked for a plan first: which library, and how it will turn out.
- Then a local demo dashboard for visual review.
- Then the whole platform.
- The owner will supply some React components, for example a "Pass" component from a React library that must be integrated.

**Recommended library: shadcn/ui** (Radix primitives with Tailwind v4, copied into the repo). This hasn't been confirmed by the owner yet. Reasons:
- The project already uses Tailwind v4.
- shadcn's default icon set is Lucide.
- It's themed entirely with CSS variables, so it maps 1:1 onto the pastel tokens. Example: `--primary: var(--rk-ink-900)`, `--accent: var(--rk-sky-100)`, `--ring: var(--rk-sky-600)`, `--background: #fff`, `--muted: #F8F8F7`, `--radius: 14px`.
- Radix components are accessible: dialog, sheet, tabs, dropdown, tooltip, progress, and so on.
- It includes a Sidebar block, Command (cmdk) for global "search a chapter or question", Sonner toasts, and Charts (Recharts) for accuracy and progress.
- Most component galleries the owner might hand over (Magic UI, Aceternity, Origin UI, React Bits) are shadcn/Tailwind-compatible, so the "Pass" component will drop in.
- Use framer-motion, which is already a dependency, for dashboard micro-interactions. Keep GSAP for the landing page only.

**Current dashboard: full inventory.** This is a read-only study of `~/Downloads/Rookie.AI-main`, which has the same code as this repo.

*Navigation and auth* (`app/(tabs)/layout.tsx`)
- **Header:** logo, coin pill and a dark/light toggle.
- **Desktop:** a left sidebar with Home, LeaderBoard, Tests, Practice (`/explore`), Bookmarks, and Settings (`/profile`) at the bottom.
- **Mobile:** a bottom bar holding all 6 items with 10px labels. The Settings item has the wrong `aria-label="Bookmarks"` (line 468).
- **Layout bug:** the sidebar is `w-62` but main is `lg:ml-52`, so content sits under the sidebar.
- **Icons:** PNGs recoloured with CSS filters, plus inline SVGs.
- **No auth guard or middleware.** The layout calls `supabase.auth.getUser()`, loads the `users` row, writes `@user`/`@user_onboarded`, and starts `initPassAutoSync`. Logged-out users just see empty data.
- **`@user` in localStorage** is the profile cache, and about 8 files read it.

*Screens*

| Route | What it is | Notes / problems |
|---|---|---|
| `app/(tabs)/page.tsx` | Stale React Native port with hard-coded chapters | Collides with `/`. **Delete.** |
| `/home` (2,341 lines) | Profile-completion modal, weekly chapter survey, greeting, Rookie Pass banner, streak card (week strip + month calendar), daily goal, continue-where-you-left-off, "Recommended for you" inline MCQ, invite friends, social card. Desktop right rail repeats streak/goal. | About 10 components in one file. Its own theme hook uses different class names from the layout. Fake "N students attempted" count and avatars (lines 1034–1037). `alert()` calls. |
| `/explore` | Exam dropdown (Main/Advanced) and 3 subject cards → `/chapterpage` | Subject stats hard-coded. Inline-styled PaywallModal. Timer-driven fake skeleton. |
| `/chapterpage` | Subject hero, year chips, chapter list → `/QuestionViewer` | All chapters and counts hard-coded (lines ≈20–357). **Dark-only:** hard-coded `text-white` breaks light mode. Advanced pass guard. |
| `/QuestionViewer` (2,147 lines) + `RookiePassModal` | Browse a chapter's questions. Solution limit is 3 free per day (`SOL_LIMIT` line 891). Similar questions via rpc `match_jee_mains`. Prev/next, buddy picker, image zoom. | Paywall block copy-pasted 6 times (lines 1471–1630). Toast/ImageModal/Spinner/BuddySelector duplicated with Practice. |
| `/practice` (1,627 lines) | Adaptive practice: XP bar/level, difficulty pill, MCQ or integer question, AI solution, weak topics, session summary, streak modal with confetti, survey | **No paywall** (unlimited solutions). Client-side coin read-modify-write. Writes AI solutions back into `jee_mains`. |
| `/bookmark` | Bookmarks only in localStorage `bookmarkedQuestions`; subject chips; collapsible re-solvable cards | Sits outside `(tabs)`, so the shell disappears. **No paywall.** Duplicate components again. |
| `/tests` | PYQ mock shifts (only `FREE_SHIFT` unlocked), create-custom-test hero (1 free per day), resume, overall donut, past tests, WizardModal | Own palette. `alert()` calls. |
| `/tests/[attemptId]` + `/result` | Exam-hall UI: TestHeader (timer, 5-min warning, aria), QuestionPanel, QuestionPalette (aside on desktop / bottom sheet on mobile), SubmitDialog. ResultView: score ring, chapter breakdown, review. Autosave to `test_answers`. | **Cleanest area.** Small typed files, `useReducer` stores. `STATUS_STYLES_DARK/LIGHT` (`features/tests/types.ts:144`) are the only real tokens in the app. Result page reads `correct_option` client-side. |
| `/leaderboard` | Podium top 3, exam filter chips, ranked list, pass-holder crown/embers/badge, sticky "me" bar | Ranked by `rookieCoinsEarned`. Fallback queries `users` directly. CSS-in-JS string. Its own palette. |
| `/profile` ("Settings") | Profile card (name, email, goal, class/exam), pick 1 of 6 AI mentor buddies, delete account | **"Delete account" deletes nothing:** it clears localStorage and routes to a non-existent `/auth/terms-agree`. No theme toggle. |
| `components/ai/Sidebar.tsx` | AI chat history sidebar | Orphan: nothing imports it. |

*Shared problems to fix in the redesign*
- **Theme:** about 10 copies of a `useTheme` hook that polls localStorage with a MutationObserver. Every screen has its own hex palette (`#0A0E17`, `#07090f`, `#060912`, …), and no Tailwind `dark:` variants are used. Replace all of it with one theme provider.
- **Duplicated components:** Toast, ImageModal, Spinner, CheckIcon and BuddySelector exist in 3 copies, the buddy list in 2, and the survey modal in 2.
- **Bookmark logic** is spread across 4 files plus `adaptivePractice`.
- **Coins** are read in 3 places, and the header count never refreshes after earning.
- **Streak logic** lives in 3 places: `streakUtils`, home's `computeStreak`, and legacy keys.
- **Paywall checks** are split between `hasRookiePass` and dynamic imports of `checkUserPaidDirectFromDB`.
- **Paywall gaps:** Practice and Bookmark aren't gated at all.
- **Installed but never imported:** react-hot-toast, react-confetti, react-markdown, gsap (dashboard side), react-use, react-native, groq-sdk, rehype-katex, remark-math.
- **Icons are mixed:** lucide, react-icons Fi/Fa/Io5, PNGs and inline SVGs. Move everything to **Lucide**.

*Gamification:* Rookie Coins (earned by speed on correct answers, shown in the header, rank the leaderboard), streak (card, calendar, confetti modal, streak gate), XP and levels (Practice only), daily goal, leaderboard podium with pass flair, 6 AI mentor "buddies" (personas with photos), and auto-bookmarking of wrong answers with a badge. There is no badges/achievements system.

*Paywall touchpoints:* explore (Advanced lock), chapterpage/QuestionViewer (Advanced redirect), QuestionViewer (3 free solutions per day), tests (1 free PYQ shift and 1 custom test per day), home banner, and leaderboard flair.

*Keep and restyle:* `app/components/renderContent.tsx` (KaTeX, markdown tables, lists), `features/tests/*` (QuestionPanel, QuestionPalette, SubmitDialog, TestHeader, ScoreRing), the leaderboard `Avatar`, `SkeletonRow`, the tests `EmptyState`, and `lib/rookiePass.ts` as the single entitlement API.

*External backend:* `https://rookie-backend.vercel.app`, with `/solution` and `/motivation`. It's used by Practice, QuestionViewer and Bookmark.

**Suggested plan for the demo.** Build it at a separate route so the real app isn't disturbed, for example `app/demo/` with mock data.
1. Install shadcn/ui (Tailwind v4 config), map its CSS variables to the tokens, and set Open Sauce Two as `--font-sans`.
2. App shell:
   - Desktop: a collapsible sidebar with Home, Practice/Explore, Tests, Bookmarks and Leaderboard, plus a profile menu and the Night-owl toggle.
   - Mobile: a bottom tab bar.
   - Global ⌘K search.
3. Home: greeting, streak and coins, a "continue where you left off" card, today's goal, and weak chapters from the recommendations. Card rows follow the single-row rule.
4. Chapter list and practice: subject tabs, chapter cards with progress rings, and a question view with OMR-style options, the owl explanation panel and a KaTeX render.
5. Tests: the wizard as a stepper inside a Sheet or Dialog, the exam-hall test UI with a palette, and a result page with charts.
6. Leaderboard and profile.
7. The Rookie Pass upsell, using the owner's component.
8. Get visual sign-off, then migrate the real screens one by one, keeping the existing Supabase logic.

---

## 6. Security

A security review exists, but it is kept **out of the public repo** on purpose. Ask the owner for the private copy.

Ground rules for frontend work:
- Don't add client-side writes to coins, XP, streaks or scores.
- Don't add new direct reads of premium content.
- Route anything sensitive through server code.

---

## 7. Owner preferences

- **Tone and process.**
  - Act; don't over-ask.
  - Show work locally for review before committing.
  - Apply feedback as targeted edits to existing work.
- **Visual taste.**
  - Editorial, calm, very "SaaS".
  - Pastel accents on white and light gray.
  - Tall cards with hover reveals.
  - Smooth motion, without gimmicky background movement.
- **Verify visually** (screenshots at 1440px and 390px, light and dark) before reporting something as done.
- **Don't invent facts** (features, numbers, dates) in copy. Take them from the code: `plans`, `RookiePassModal`, API limits.

---

## 8. Dashboard demo (`/demo`) and its rules

**Where it lives.**
- Run it at `http://localhost:3123/demo`. It uses sample data only: no Supabase calls, no auth.
- Library: **shadcn/ui** (the `base-nova` style, built on Base UI, so it composes with a `render` prop rather than `asChild`) with Tailwind v4. The components are in `components/ui/*`.
- `lib/utils.ts` uses `clsx` + `tailwind-merge`. The shadcn CLI kept installing a package called `cn`; it was removed on purpose, so don't reinstall it.
- The theme is in `app/globals.css` and maps the shadcn CSS variables to the pastel tokens.
- Open Sauce Two is the global `--font-sans`, so the old dashboard pages now render in it too.
- Dark mode is `html.dark`, toggled from the same `theme` localStorage key the landing page uses.
- `html.rk-app` gives overlays (sheets, menus, the search palette) the pastel roles, because they render outside the page wrapper.
- Files:
  - `app/demo/_shell.tsx`: sidebar, top bar, mobile bottom bar, ⌘K search, Night owl toggle, Pass slot.
  - `app/demo/page.tsx`: the Home page.
  - `app/demo/_data.ts`: sample data and the `sale` config.

**The owner's dashboard rules.** These were set on 2026-11-13 and apply to the whole app.

1. **Colour is intentional.** The default is gray and neutral: white cards on the `#F8F8F7` canvas, gray icons, gray labels. Use colour only where it means something:
   - **Blue** for CTAs (`--primary` = sky-700, white text), progress, and "you".
   - **Pastel blue** (`--secondary` = sky-100 with sky-800 text) for secondary CTAs and selection.
   - **Mint and red** for right and wrong answers.
   - **Gold, silver and bronze** for leaderboard medals.
   - **The sale banner and the Rookie Pass card**, which are deliberately special.
   - Don't add other pastels unless the owner asks.
2. **Corners:** 8px for controls and inner items, **16px max** for cards. Never larger. `--radius` is 0.5rem, and `--radius-2xl/3xl/4xl` are capped at 16px.
3. **Metric cards:** just the icon and the heading. No frame or background behind icons.
4. **The festive sale banner** is a vibrant pink→orange→marigold gradient with a countdown and a one-click "Buy now".
5. **The Rookie Pass card** uses a standout night-sky gradient (navy→blue with a marigold glow and faint stars), shows original and sale prices, the countdown, three perks and one-click Buy.
6. **The leaderboard widget** has a Top 3 podium (medal rings, a crown on #1) and a Top 10 list (coin bars, up/down movement), with a "you" row in pastel blue.
7. **The sale prices (`$9.99` → `$3.99`) are display-only.** Razorpay charges what the backend `plans` table says, ₹399. The currency is also unconfirmed: `$` was used because that's how the owner wrote the numbers.
8. **Frontend only.** Don't change backend routes, the Razorpay webhook, login logic or the database.

**Rules added later on 2026-11-13.**
- **Scale:** the dashboard base font is 14px (`html:has(.rk-app)` in `app/demo/demo.css`); the landing page stays at 16px. Type scale: display 2.6rem, values 2.4rem, sections 1.35rem, body 1rem, meta 0.8rem. Big and small text are kept far apart on purpose. Sidebar labels are 13px.
- **Prices are in rupees:** ~~₹999~~ → **₹399 / year** (60% off). Always say it's yearly ("Yearly" tag, "/ year", "One payment for 12 months").
- **One gradient for everything Rookie Pass** (`PASS_BG` in `app/demo/_sale.tsx`): the sticky sale bar, the sidebar Pass card and the main Pass card.
- **The "% off" tag** uses a coral→orange gradient (`OffTag`). The owner rejected the marigold version as dull.
- **The sale bar** is a slim strip, sticky at the top of the content column (not over the sidebar), with no pulsing dot.
- **The timer** shows numbers only (`dd:hh:mm:ss`), no unit letters, and its digits flip like a clock (`FlipCountdown`).
- **The leaderboard** is a celebratory dark stage: spotlight beams on #1, a crown, medal rings, and canvas-confetti that fires on view, when switching to Top 3, and when clicking a podium avatar.
- **The sidebar collapse button** sits on the same line as the logo. When collapsed, only the owl shows, in a square, and hovering it turns it into an expand button. Menu icons show their label in a tooltip.
- **Every metric or data heading ships with a hover definition** using `<Define term=…>` from `app/demo/_define.tsx`. Add a definition there for each new metric. Every interactive element has a hover state.

---

## 9. Platform revamp (frontend only), state on 2026-11-13

The whole logged-in app has been re-skinned with the design system. Logic is unchanged: the same Supabase queries and RPCs, `/api/*` and backend calls, storage keys, routes, analytics, and Pass checks and limits. **No backend files were touched** (`app/api/**`, `lib/**` except the new `lib/sale.ts`, `*.sql`).

**Shared foundation (`components/rookie/`)**
- `app-shell.tsx`
  - `AppShell`: sidebar with the collapse button next to the logo, a sticky sale bar, the top bar (⌘K search, streak, coins, theme, account menu), the mobile bottom nav, and toasts.
  - `FocusShell`: for the practice, question-viewer and test screens.
- `ui.tsx` (primitives), `sale.tsx` (Pass card, sale bar, flip countdown, `useBuyPass` → the existing `triggerCheckout`), `define.tsx` (hover definitions), `stage.tsx` (leaderboard confetti and spotlight), `toast.tsx`, `theme.tsx`, `rookie.css`.
- `lib/sale.ts`: the single place the Pass price is shown from (₹999 → ₹399 / year). The landing page uses it too.

**Layouts**
- `app/(tabs)/layout.tsx` uses AppShell and keeps the old layout's logic: user row → `@user`, coins, the wrong-answer badge and `initPassAutoSync`.
- `bookmark` and `chapterpage` moved into `(tabs)`. Their URLs are unchanged; they now get the shell.
- `app/practice`, `app/QuestionViewer` and `app/tests` each have a `layout.tsx` with FocusShell.

**Checkout inside dialogs:** Razorpay's iframe can't take focus inside a modal dialog. Two fixes are in place:
- Paywall dialogs that use `PassPitch` close when checkout starts (`useCloseOnCheckout`).
- `RookiePassModal` becomes non-modal while `loading` is true.

**Behaviour changes made on purpose** (all presentation, all small)
- `alert()` → toasts, with the same messages.
- Locked PYQ shifts and Explore open a Pass dialog first, instead of jumping straight into checkout.
- Home's streak sync runs once per load instead of twice. The old page rendered the card twice.
- `renderContent` now gets the real theme. Before, it always ran in dark mode.
- Home's "Continue practice" goes to `/explore` when there's no recent session.
- Practice shows the weak topics it already loaded.
- The `/demo` route has been removed (backup is in the session scratchpad).

**Bugs already in the original, left as-is** (fixing them would change logic; ask the owner first)
- The Profile "Delete account" button deletes nothing: it clears storage and routes to the missing `/auth/terms-agree`.
- Profile saves the class as `cl` but reads it back as `class`, so it reverts on reload.
- Bookmarks never opens its solution panel (`solutionRequested` is never set), and MCQ grading there is case-sensitive.
- Practice: on question 10, 20, … "Keep practicing" reopens the summary straight away (a loop).
- Tests: when the timer hits 0 it only opens the submit dialog; it doesn't auto-submit. The preview counts ignore the chosen years and exam.
- QuestionViewer: without a `chapter` param it loads forever. `similar_shown` is always 0. JEE Advanced runs the similar-question RPC against `jee_mains`.
- Home: "N attempted" is a random number. Resume progress assumes 30 questions per chapter.
- Explore's subject counts are hard-coded and don't match chapterpage.

**Deploy (Vercel)**
- `next build` passes.
- Env vars needed on Vercel: `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (the same as before).
- The Supabase anon key and the Firebase config are still hard-coded, as they were before.
- **Price:** the backend `plans` price is updated to match the ₹399 shown, so checkout charges ₹399.

---

## 10. Dropper Design System

- Everything lives in `dropper/`. The docs are in `dropper/README.md`, and the live reference is at `/design-system`.
- **Tokens:** `dropper/tokens/tokens.ts` → `npm run tokens` → `tokens.css` (variables) + `theme.css` (Tailwind utilities). The utilities include `rounded-control`, `rounded-card`, `text-display…caption`, `p-card`, `gap-stack`, `mt-section`, `bg-canvas/surface/sunken`, `text-fg/-muted`, `bg-action-primary/secondary`, `max-w-content/focus`, and more.
- **Wiring:**
  - shadcn's variables map onto Dropper semantics in `app/globals.css`.
  - `components/ui/button.tsx` re-exports the Dropper Button.
  - `components/rookie/ui.tsx` re-exports the Dropper primitives.
  - `lib/utils.ts`'s `cn()` knows the token class names, so tailwind-merge doesn't drop them.
- **Screens:** all hand-typed corners, type sizes and widths were codemodded to tokens. The landing page wasn't touched.
