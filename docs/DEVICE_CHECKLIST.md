# On-device verification checklist (M0 and M2)

These could not be verified in the headless build environment. Run on an Android emulator or phone (`npx expo run:android`) and tick each item.

- [ ] App launches to **Notes** with a dark background and no white flash.
- [ ] Bottom bar shows four tabs in order: Notes, Capture, Sticky, Library, with icons and labels.
- [ ] Selected tab is clearly distinguishable (indicator + label colour).
- [ ] Each tab shows its title, subtitle and empty state; **no content is hidden behind the tab bar** (native tab bar inset; adjust `Screen` if anything is clipped).
- [ ] Notes → "Scan a page" switches to the Capture tab.
- [ ] Android hardware/gesture back from a non-Notes tab behaves sensibly (returns to Notes or exits; note which).
- [ ] Status bar icons are light and legible on all tabs.
- [ ] System font size set to the largest: titles and buttons stay readable and nothing is cut off.
- [ ] TalkBack: each tab is announced with its label; screen titles are announced as headings; the "Scan a page" button is announced as a button.
- [ ] Rotate / split-screen does not crash (orientation is locked to portrait).

## M2: accounts (needs a real `.env`)

- [ ] Fresh install shows **Sign In** (not the tabs). No white flash; splash hides once.
- [ ] Create Account with a new email: either lands in the app (confirmation off) or shows the "confirm your email" notice and returns to Sign In (confirmation on). Confirm the real email arrives.
- [ ] Wrong password shows "The email or password is incorrect." Airplane mode shows the network message.
- [ ] Keyboard never covers the focused field or the submit button on a small phone; "next" moves name, email, password; "done" submits.
- [ ] Password show/hide works; strength meter text changes as you type.
- [ ] Kill and reopen the app: still signed in. Hardware back from the tabs does not return to Sign In.
- [ ] Person button (top right of each tab) opens Profile with initials, name, email and "Free plan". Back returns to the same tab.
- [ ] Sign out returns to Sign In; reopening stays signed out.
- [ ] Delete account: Cancel does nothing; confirming returns to Sign In, and signing in with that account fails. Check in the Supabase dashboard that the user and profile rows are gone.
- [ ] TalkBack: errors are announced when they appear; the form fields are announced with their labels.

## M1: OCR lab (dev builds only; native code, so a rebuild is required)

Rebuild the native app (new native module and scanner plugin):

```
npm install
npx expo prebuild --clean --platform android
npx expo run:android
```

If the build fails, copy the first red error from the terminal (usually the `Execution failed for task` block) and send it back. The Kotlin module has never been compiled.

- [ ] App builds and launches; sign-in still works.
- [ ] Capture tab shows an **Open OCR lab (dev only)** button (it must not exist in a release build).
- [ ] **Scan pages** opens Google's scanner (needs Google Play services). Scan 1 to 5 pages.
- [ ] Cancelling the scanner returns to the lab with nothing broken. Tapping Scan repeatedly never starts two runs.
- [ ] Each page shows its thumbnail, time in ms, word count, overall confidence and every line with its own percentage.
- [ ] Lines under 70% show a warning icon and the word "Check".
- [ ] Try: a printed page, a neat handwritten page, a messy handwritten page, a whiteboard, a page in dim light. Note the confidence and how wrong the text really is.
- [ ] **Share results** sends a text report. Please send me the reports plus your honest verdict on how accurate the text was.
- [ ] Airplane mode: recognition still works (it is offline).

### No camera on the emulator? (OCR lab alternatives)

- **Import from gallery** in the OCR lab reads any photo already on the device. On the emulator, drag a photo file from Windows onto the emulator window; it is saved to Downloads and appears in the picker. Needs a native rebuild (`npx expo run:android`) because `expo-image-picker` is a new native module.
- **Real phone:** enable USB debugging on the phone, plug it in, run `adb devices` to confirm it is listed, then `npx expo run:android --device`. Handwriting results from a real camera are the most useful test.
- **Emulator camera (scanner only):** the AVD must use a Google Play system image. In AVD settings, Advanced, set Back camera to VirtualScene. The scan then points at a virtual room, so it only proves the scanner opens, not OCR quality.
- [ ] Import from gallery: pick 1 to 5 photos; each is read and shown like a scanned page.
