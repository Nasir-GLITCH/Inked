/**
 * Up to two initials for the avatar: first and last word of the name, or the first
 * letter of the email as a fallback. Returns "?" when nothing usable is available.
 */
export function getInitials(displayName: string | null, email: string | null): string {
  const words = (displayName ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    const first = Array.from(words[0])[0];
    const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : '';
    return `${first}${last}`.toUpperCase();
  }
  const emailInitial = Array.from((email ?? '').trim())[0];
  return emailInitial ? emailInitial.toUpperCase() : '?';
}
