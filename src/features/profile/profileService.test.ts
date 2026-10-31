import { fetchProfile } from '@/features/profile/profileService';
import { getSupabase } from '@/services/supabase';

jest.mock('@/services/supabase', () => ({ getSupabase: jest.fn() }));

const mockMaybeSingle = jest.fn();
const mockSelect = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

beforeEach(() => {
  jest.resetAllMocks();
  mockSelect.mockReturnValue({ maybeSingle: mockMaybeSingle });
  mockFrom.mockReturnValue({ select: mockSelect });
  jest.mocked(getSupabase).mockReturnValue({ from: mockFrom } as never);
});

describe('fetchProfile', () => {
  it('reads only the columns it needs from the profiles table', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { display_name: 'Alex', plan: 'free' },
      error: null,
    });

    await fetchProfile();

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockSelect).toHaveBeenCalledWith('display_name, plan');
  });

  it('maps a row to a profile', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { display_name: 'Alex', plan: 'pro' },
      error: null,
    });

    await expect(fetchProfile()).resolves.toEqual({
      ok: true,
      data: { displayName: 'Alex', plan: 'pro' },
    });
  });

  it('treats an unknown plan value as free instead of granting access', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { display_name: null, plan: 'enterprise-unlimited' },
      error: null,
    });

    await expect(fetchProfile()).resolves.toEqual({
      ok: true,
      data: { displayName: null, plan: 'free' },
    });
  });

  it('fails when the server returns an error', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(fetchProfile()).resolves.toEqual({ ok: false });
  });

  it('fails when there is no row for the user', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(fetchProfile()).resolves.toEqual({ ok: false });
  });

  it('fails without throwing, and without logging the error message, on a thrown error', async () => {
    mockMaybeSingle.mockRejectedValue(new Error('secret detail'));
    const logged = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(fetchProfile()).resolves.toEqual({ ok: false });

    expect(JSON.stringify(logged.mock.calls)).not.toContain('secret detail');
  });
});
