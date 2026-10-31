import { getInitials } from '@/features/profile/initials';

describe('getInitials', () => {
  it('uses the first and last word of the name', () => {
    expect(getInitials('Alex Sterling', null)).toBe('AS');
    expect(getInitials('  alex   van   sterling ', null)).toBe('AS');
  });

  it('uses one letter for a single-word name', () => {
    expect(getInitials('Madonna', null)).toBe('M');
  });

  it('falls back to the email when there is no name', () => {
    expect(getInitials(null, 'zed@example.com')).toBe('Z');
    expect(getInitials('   ', 'zed@example.com')).toBe('Z');
  });

  it('returns a placeholder when nothing is available', () => {
    expect(getInitials(null, null)).toBe('?');
    expect(getInitials('', '')).toBe('?');
  });

  it('does not split characters outside the basic plane', () => {
    expect(getInitials('😀 Bob', null)).toBe('😀B');
  });
});
