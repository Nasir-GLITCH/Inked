# Decision records

Short records of choices that affect architecture or future maintenance. Newest last.

## ADR-001 — Name

The product is **Inked**. Designs that say "Inkslate" are superseded. (Owner decision, 2026-10-26.)

## ADR-002 — No end-to-end encryption

End-to-end encryption is not required. Data is encrypted in transit (HTTPS) and at rest by the provider. Consequences: server-side search and AI synthesis are possible; no vault key recovery problem; the designs' "RSA-4096 / AES-256 / Zero Cloud" copy must not ship. Any privacy claim in the UI must describe what the app actually does.

## ADR-003 — Android first, iOS-compatible

Owner develops on Windows with no Mac and wants a minimum budget. Android is built and tested first (local builds are free; Play Console is a one-time fee). iOS requires a paid Apple Developer account for any device install or release, so it is deferred. Code must stay iOS-compatible. Sign in with Apple is only required once iOS ships with Google sign-in.

## ADR-004 — TypeScript

TypeScript (strict) from day one, by owner decision. The project rule against introducing TypeScript into an existing JavaScript project does not apply (greenfield).

## ADR-005 — English only

English-first. No Greek/Latin OCR or localisation in the first release. UI strings should still be kept out of deep logic so localisation stays possible.

## ADR-006 — Free app, Pro-ready

The app launches free. To make a later Pro tier cheap to add: store a plan/entitlement on the user profile from the first schema, and gate features through a single `hasEntitlement()` helper rather than ad-hoc checks. Billing integration (e.g. RevenueCat) is deferred. Cost control: AI synthesis has a per-user daily quota enforced server-side from day one, because every call costs money.

## ADR-007 — OCR on device (provisional)

On-device OCR avoids per-scan cost, which suits a free app and a minimal budget. Provisional until the M1 spike measures accuracy on real pages.

## ADR-008 — Accepted `npm audit` findings (tooling only)

`npm audit` reports high-severity advisories in `@expo/cli` (via `node-forge` and `zod`). These are in the dev server / build tooling, not in the shipped app bundle. The suggested `npm audit fix --force` downgrades Expo to v44 and must **not** be applied. Revisit when a newer SDK patch is released.

## ADR-009 — Test files never live under `src/app/`

Expo Router treats every file under `src/app/` as a route and bundles it. A test file there broke the production bundle. Screens live in `src/features/<name>/` and route files are one-line re-exports.

## ADR-010 — Icon imports

Import icons from the family path (`@expo/vector-icons/MaterialIcons`), not the package root. The root import bundled every icon font and roughly doubled the export size (8.3 MB vs 4.3 MB measured).

## ADR-011 — Account deletion lives in an edge function

Deleting an auth user needs the Supabase secret key, which must never ship in the app. The `delete-account` edge function (`verify_jwt = true`) re-validates the caller's token and deletes only that user; the id is never read from the request body. `public.profiles` is removed by `ON DELETE CASCADE`. **Whenever a table or storage bucket with user data is added, this function must also delete that data** (cascade it, or delete it explicitly) and a test must prove it. Play Store and App Store both require in-app account deletion.

## ADR-012 — Entitlements are server-controlled

`profiles.plan` (`free` | `pro`) is readable by the user but writable only with the server-side key (column-level grant: clients can update `display_name` only). The app maps any unknown value to `free`. Feature gating must go through one helper (to be added with the first gated feature), and sensitive limits (such as the AI daily quota) are enforced on the server, never only in the app.

## ADR-013 — Session handling and route guards

- The session is stored encrypted: an AES key in the device keystore (`expo-secure-store`), the encrypted session in AsyncStorage (SecureStore alone cannot hold a full session). Tokens refresh only while the app is in the foreground.
- Navigation uses `Stack.Protected` driven by auth state. Guards only choose which screens the user sees; **access to data is enforced by RLS**, never by the guards.
- Auth failures are mapped to a small set of safe messages. Raw server messages are never shown, and passwords, tokens and emails are never logged.
- `EXPO_PUBLIC_*` values are bundled into the app and public. Only the Supabase URL and the **publishable** key belong there.

## ADR-014 — Auth screen deviations from the supplied designs (pending owner approval)

The Sign In and Create Account designs contain items that are false for this product or not buildable yet. They are **omitted or reworded in code but not yet approved by the owner**:

| Design element                                                    | Built as                             | Reason                                                                     |
| ----------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------- |
| "Master Key (Password)", "End-to-End Encrypted", "AES-256" labels | "Password" with no encryption claims | ADR-002: no E2EE, claims would be false                                    |
| "Local On-Device OCR · Zero Cloud" toggle                         | Omitted                              | Images will sync to cloud storage; claim would be false                    |
| "Daily E-Paper Digest" toggle                                     | Omitted                              | E-paper / Kindle features were dropped                                     |
| Apple ID button                                                   | Omitted                              | Android first (ADR-003)                                                    |
| Google button                                                     | Omitted                              | Needs Google OAuth set up in Google Cloud and Supabase first               |
| "Forgot password?" link                                           | Omitted                              | Needs an email-link and deep-link flow; must be built before launch        |
| "Unlock with Face ID" card                                        | Omitted                              | Belongs to the app-lock feature, not built yet                             |
| Top bar with back arrow and person icon on the auth screens       | Omitted                              | Nothing to go back to; the person icon had no destination while signed out |
| "AI SYNTHESIS" chip and ring on the logo                          | Omitted                              | Decoration; real logo asset not supplied yet (placeholder icon used)       |
| Footer "Inkslate Technical Protocol v3.4.1"                       | "Inked v<app version>"               | Name decision (ADR-001)                                                    |
| Privacy/terms line only on Sign In                                | Shown on both screens                | Consent is needed at sign-up                                               |

Profile screen: only the identity header, Sign out and Delete account are built so far. Delete account is not in the design but is required by the stores. Stats, storage meter, OCR engine and preference rows wait for the features that feed them.

## ADR-015 — OCR approach and page scanner

- **Recognition:** Google ML Kit text recognition (Latin script, bundled model, fully offline, free) through a small local Expo module, `modules/inked-ocr` (Android only for now). Existing React Native wrappers do not return confidence scores, which the Transcription Editor needs to mark uncertain words, so the module returns text, line and word frames, line angle and per-line/per-word confidence. The native result is treated as untrusted and validated with zod in `src/features/ocr/recognitionSchema.ts`.
- **Scanning:** Google's ML Kit Document Scanner through `react-native-document-scanner-plugin` (pinned at 2.0.4). It gives automatic edge detection, deskew and cleanup without building a camera screen yet. The custom camera screen from the design comes later.
- **Known limits of the scanner plugin:** no import from the gallery; requires Google Play services; version 2.0.4 can leave the promise unresolved if the scanner returns an unexpected result code. Any of these may push us to a custom camera sooner.
- **Handwriting:** ML Kit's Latin model is built for printed text. Handwriting accuracy is exactly what the OCR lab (dev-only) is for measuring on the owner's real pages before any more is built on top. If it is poor, the options are a cloud model for handwriting (cost and privacy trade-offs to be decided with the owner).
- **Confidence:** a page's score is the average of its line scores weighted by character count; lines under 70% are flagged "Check". These numbers are ML Kit's own estimates, not measured accuracy.
- **Unverified:** the Kotlin module has not been compiled; the build environment has no Android SDK. First build on the owner's machine is the first real test.

## ADR-016 — Cloud OCR evaluation (Gemini via an edge function)

- **Why:** the on-device engine (ADR-015) scored 66% on a photographed handwritten form. Printed and handwritten pages are both in scope, so a cloud engine is evaluated side by side before any engine is chosen.
- **How:** the OCR lab sends each page to the `ocr-cloud` edge function, which calls Google's Gemini API (`generateContent`, model `gemini-3.8-flash`, override with the `GEMINI_MODEL` secret). The key lives only in the function secret `GEMINI_API_KEY`; the function requires a signed-in user (`verify_jwt`). The app never sees the key.
- **Privacy:** page images leave the device and go to Google. On the free tier Google may use submitted content to improve its products, so **only non-sensitive pages should be tested**. This conflicts with any "your notes never leave your device" claim, so no such claim may be made in the app until the final engine is chosen.
- **Evaluation endpoint only:** no per-user quota, rate limiting or cost cap. These must exist before any public release (ADR-012: limits are enforced on the server).
- **No confidence from the cloud engine:** it returns plain text. The Transcription Editor's per-word uncertainty marking would need another approach (for example the on-device scores as a hint, or Google Cloud Vision, which returns confidence).
- **Open:** engine choice and the cost/privacy trade-off, pending the owner's side-by-side results.
