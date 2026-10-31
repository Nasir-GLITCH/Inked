import { render, screen, userEvent } from '@testing-library/react-native';
import * as WebBrowser from 'expo-web-browser';

import { getLegalLinks } from '@/config/env';
import { LegalNotice } from '@/features/auth/LegalNotice';

jest.mock('@/config/env', () => ({ getLegalLinks: jest.fn() }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));

const mockGetLegalLinks = jest.mocked(getLegalLinks);
const mockOpenBrowser = jest.mocked(WebBrowser.openBrowserAsync);

beforeEach(() => {
  jest.resetAllMocks();
});

describe('LegalNotice', () => {
  it('shows plain text, not dead links, when no URLs are configured', async () => {
    mockGetLegalLinks.mockReturnValue({});
    await render(<LegalNotice />);

    expect(screen.getByText(/By continuing, you accept/)).toBeOnTheScreen();
    expect(screen.queryByRole('link')).not.toBeOnTheScreen();
  });

  it('opens the configured privacy policy and terms', async () => {
    mockGetLegalLinks.mockReturnValue({
      privacyPolicyUrl: 'https://example.com/privacy',
      termsUrl: 'https://example.com/terms',
    });
    mockOpenBrowser.mockResolvedValue({ type: 'dismiss' } as WebBrowser.WebBrowserResult);
    const user = userEvent.setup();
    await render(<LegalNotice />);

    await user.press(screen.getByRole('link', { name: 'Privacy Policy' }));
    await user.press(screen.getByRole('link', { name: 'Terms of Use' }));

    expect(mockOpenBrowser).toHaveBeenNthCalledWith(1, 'https://example.com/privacy');
    expect(mockOpenBrowser).toHaveBeenNthCalledWith(2, 'https://example.com/terms');
  });

  it('does not crash when the browser cannot be opened', async () => {
    mockGetLegalLinks.mockReturnValue({ privacyPolicyUrl: 'https://example.com/privacy' });
    mockOpenBrowser.mockRejectedValue(new Error('no browser'));
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const user = userEvent.setup();
    await render(<LegalNotice />);

    await user.press(screen.getByRole('link', { name: 'Privacy Policy' }));

    expect(console.warn).toHaveBeenCalledTimes(1);
  });
});
