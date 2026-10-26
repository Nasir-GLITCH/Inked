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
