# Inked

Smart note-taking app focused on OCR: scan a page, proofread the transcription, file it, read it, and synthesise it.

**Status: Milestone M0 (foundation) built; on-device verification pending.** The app shell, design tokens and tooling exist. There is no scanning, OCR, accounts or backend yet. See [Roadmap](#roadmap).

## Stack

- Expo SDK 58, React Native 0.88, Expo Router (typed routes), TypeScript (strict)
- Jest + React Native Testing Library, ESLint, Prettier
- Planned: Supabase (auth, Postgres with RLS, storage, edge functions), on-device OCR, local SQLite

## Setup

Requirements: Node 22 (`.nvmrc`), npm, Android Studio (Android SDK + emulator or a USB-debugging phone).

```bash
npm install
npm run check        # lint + typecheck + format check + tests (run before every commit)
npx expo start       # dev server
```

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
  features/       One folder per feature; screens, hooks, services live together.
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

## Known limitations (M0)

- Screens are honest empty states; no feature is wired to real data yet.
- Not yet verified on a physical device or emulator (only unit/component tests and a production Android bundle export in a headless environment). Checklist: [docs/DEVICE_CHECKLIST.md](docs/DEVICE_CHECKLIST.md).
- `npm audit` reports advisories inside `@expo/cli` (dev tooling, not shipped in the app). See [docs/DECISIONS.md](docs/DECISIONS.md#adr-008).

## Roadmap

M0 Foundation (built, device check pending) · M1 OCR/PDF spikes · M2 Backend + auth · M3 Local data + sync · M4 Capture · M5 OCR + editor · M6 Library/filing/search · M7 Reader + sticky · M8 AI synthesis · M9 Export · M10 Hardening + release. Full plan: `INKED_DISCOVERY_PLAN.md` in the project.
