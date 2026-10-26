# M0 on-device verification checklist

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
