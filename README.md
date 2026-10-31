# Inked

Smart note-taking app focused on OCR: scan a page, proofread the transcription, file it, read it, and synthesise it.

**Status: M0 (foundation) and M2 (accounts) built; on-device verification pending.** Email/password sign-up and sign-in, secure session storage, route guards, sign-out and account deletion are implemented against Supabase. There is no scanning, OCR or note storage yet. See [Roadmap](#roadmap).

## Stack

- Expo SDK 58, React Native 0.88, Expo Router (typed routes), TypeScript (strict)
- Jest + React Native Testing Library, ESLint, Prettier
- Supabase: auth, Postgres with Row Level Security, edge functions (in use). Planned: storage, on-device OCR, local SQLite

## Setup

Requirements: Node 22 (`.nvmrc`), npm, Android Studio (Android SDK + emulator or a USB-debugging phone).

```bash
cp .env.example .env   # then fill in the two Supabase values (see Configuration)
npm install
npm run check        # lint + typecheck + format check + tests (run before every commit)
npx expo start       # dev server
```

### Configuration

Copy `.env.example` to `.env` (git-ignored). Only **public** values go there, because everything in `EXPO_PUBLIC_*` is bundled into the app:

| Variable                                                  | Value                                                      |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`                                | Project URL, `https://<ref>.supabase.co`                   |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                    | The `sb_publishable_...` key (safe: RLS protects the data) |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL`, `EXPO_PUBLIC_TERMS_URL` | Optional. When empty, the sign-in text shows without links |

Never put a secret or service-role key in the app. If configuration is missing, the app shows a setup message instead of crashing. Restart with `npx expo start -c` after changing `.env`.

### Backend (Supabase)

`supabase/migrations/` is the source of truth for the schema, `supabase/functions/` for edge functions, `supabase/tests/rls_profiles.sql` for the access-control tests (run it in the SQL editor: success is an error reading `RLS_TESTS_PASSED`; nothing is committed). Users cannot change their own plan; see `docs/DECISIONS.md` (ADR-011 to ADR-013).

### Running on Android (Windows-friendly)

The app will use native modules (camera, OCR, biometrics), so it will need a **development build**, not Expo Go.

- **Local build (free):** install Android Studio and a JDK, then `npx expo run:android`. This works on Windows.
- **Cloud build:** `npx eas-cli@latest build --profile development --platform android`. EAS free-tier build limits apply; check current limits on expo.dev before relying on it.

iOS builds need a paid Apple Developer account and cannot be built locally on Windows (EAS cloud builds can). iOS is deferred; the code is written to remain iOS-compatible.

## Scripts

| Script              | Purpose                                |
| ------------------- | -------------------------------------- |
| `npm run lint`      | ESLint (expo config + prettier compat) |
| `npm run typecheck` | `tsc --noEmit`                         |
| `npm run format`    | Prettier write                         |
| `npm run test`      | Jest                                   |
| `npm run test:ci`   | Jest with coverage                     |
| `npm run check`     | All of the above checks                |

## Project structure

```
src/
  app/            Expo Router routes only. Files here must stay thin re-exports (every file is a route).
  features/       One folder per feature (auth, profile, ...); screens, hooks, services live together.
  services/       Shared integrations (Supabase client, secure session storage).
  config/         Environment parsing and the setup-error screen.
  components/     ui/ (primitives) and layout/ (screen scaffolding).
  theme/          Design tokens (colour, spacing, type scale, sizes).
  test/           Test-only helpers and global Jest setup.
docs/             Decisions and release notes.
```

Rules: never put tests or helpers in `src/app/`; add a folder only when it has a file in it.

## Before first release (must do)

- [ ] Replace the placeholder bundle/package id `com.inked.app` in `app.json` with an id you own. It is **permanent** once uploaded to Play.
- [ ] Replace the placeholder Expo icon and splash images in `assets/images/`.
- [ ] Privacy policy, Play Data Safety form, account deletion flow (arrive with the backend milestones).

## Known limitations

- Notes, Capture, Sticky and Library are honest empty states; only accounts are wired to the backend.
- No password reset, Google sign-in or biometric app lock yet (see ADR-014). Password reset must be built before launch.
- Supabase's built-in email sender is heavily rate-limited; use a custom SMTP provider before real users sign up.
- Not yet verified on a physical device or emulator (only unit/component tests and a production Android bundle export in a headless environment). Checklist: [docs/DEVICE_CHECKLIST.md](docs/DEVICE_CHECKLIST.md).
- The RLS tests (17 checks) passed against the live `inked` project on 2026-10-31. They are run by hand, not in CI; re-run them after any schema change.
- `npm audit` reports advisories inside `@expo/cli` (dev tooling, not shipped in the app). See [docs/DECISIONS.md](docs/DECISIONS.md#adr-008).

## Roadmap

M0 Foundation (built, device check pending) · M1 OCR/PDF spikes (waiting on sample pages) · M2 Backend + auth (email/password built; Google, reset and app lock pending) · M3 Local data + sync · M4 Capture · M5 OCR + editor · M6 Library/filing/search · M7 Reader + sticky · M8 AI synthesis · M9 Export · M10 Hardening + release. Full plan: `INKED_DISCOVERY_PLAN.md` in the project.
