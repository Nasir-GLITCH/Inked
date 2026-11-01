import { render, screen, userEvent } from '@testing-library/react-native';
import { Share } from 'react-native';

import { OcrLabScreen } from './OcrLabScreen';
import { makeRecognition } from './fixtures';

const mockScanPages = jest.fn();
const mockRecognizeText = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn(), push: jest.fn() }) }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('@/features/capture/documentScanner', () => ({
  scanPages: () => mockScanPages(),
  scanFailureMessage: () => 'The page scanner is not available in this build of the app.',
}));
jest.mock('./ocrService', () => ({
  ...jest.requireActual('./ocrService'),
  recognizeText: (uri: string) => mockRecognizeText(uri),
}));

describe('OcrLabScreen', () => {
  beforeEach(() => {
    mockScanPages.mockReset();
    mockRecognizeText.mockReset();
  });

  it('scans, reads each page and shows time, words and per-line confidence', async () => {
    mockScanPages.mockResolvedValue({ status: 'success', imageUris: ['file:///a.jpg'] });
    mockRecognizeText.mockResolvedValue({
      ok: true,
      recognition: makeRecognition([
        { text: 'Clear line', confidence: 0.95 },
        { text: 'Smudged line', confidence: 0.4 },
      ]),
    });
    const user = userEvent.setup();
    await render(<OcrLabScreen />);

    await user.press(screen.getByRole('button', { name: 'Scan pages' }));

    expect(await screen.findByText(/250 ms · 4 words/)).toBeOnTheScreen();
    expect(screen.getByText('Clear line')).toBeOnTheScreen();
    expect(screen.getByText('Check 40%')).toBeOnTheScreen();
    expect(mockRecognizeText).toHaveBeenCalledWith('file:///a.jpg');
  });

  it('shows a failure for a page that could not be read', async () => {
    mockScanPages.mockResolvedValue({ status: 'success', imageUris: ['file:///a.jpg'] });
    mockRecognizeText.mockResolvedValue({ ok: false, code: 'image_unreadable' });
    const user = userEvent.setup();
    await render(<OcrLabScreen />);

    await user.press(screen.getByRole('button', { name: 'Scan pages' }));

    expect(await screen.findByText('This image could not be opened.')).toBeOnTheScreen();
  });

  it('announces when the scanner is unavailable', async () => {
    mockScanPages.mockResolvedValue({ status: 'error', code: 'unavailable' });
    const user = userEvent.setup();
    await render(<OcrLabScreen />);

    await user.press(screen.getByRole('button', { name: 'Scan pages' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/not available in this build/);
  });

  it('does nothing visible when the user cancels the scanner', async () => {
    mockScanPages.mockResolvedValue({ status: 'cancelled' });
    const user = userEvent.setup();
    await render(<OcrLabScreen />);

    await user.press(screen.getByRole('button', { name: 'Scan pages' }));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(mockRecognizeText).not.toHaveBeenCalled();
  });

  it('shares a report once all pages are finished', async () => {
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    mockScanPages.mockResolvedValue({ status: 'success', imageUris: ['file:///a.jpg'] });
    mockRecognizeText.mockResolvedValue({
      ok: true,
      recognition: makeRecognition([{ text: 'Hello', confidence: 0.9 }]),
    });
    const user = userEvent.setup();
    await render(<OcrLabScreen />);

    await user.press(screen.getByRole('button', { name: 'Scan pages' }));
    await user.press(await screen.findByRole('button', { name: 'Share results' }));

    expect(share).toHaveBeenCalledWith({ message: expect.stringContaining('(90%) Hello') });
  });
});
