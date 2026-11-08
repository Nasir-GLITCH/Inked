import { render, screen, userEvent } from '@testing-library/react-native';
import { Share } from 'react-native';

import { OcrLabScreen } from './OcrLabScreen';
import { makeRecognition } from './fixtures';

const mockScanPages = jest.fn();
const mockRecognizeText = jest.fn();
const mockPickImages = jest.fn();
const mockCloud = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn(), push: jest.fn() }) }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('@/features/capture/documentScanner', () => ({
  scanPages: () => mockScanPages(),
  scanFailureMessage: () => 'The page scanner is not available in this build of the app.',
}));
jest.mock('@/features/capture/imageImport', () => ({
  pickImages: () => mockPickImages(),
}));
jest.mock('./cloudOcrService', () => ({
  ...jest.requireActual('./cloudOcrService'),
  recognizeTextInCloud: (uri: string) => mockCloud(uri),
}));
jest.mock('./ocrService', () => ({
  ...jest.requireActual('./ocrService'),
  recognizeText: (uri: string) => mockRecognizeText(uri),
}));

describe('OcrLabScreen', () => {
  beforeEach(() => {
    mockScanPages.mockReset();
    mockRecognizeText.mockReset();
    mockPickImages.mockReset();
    mockCloud.mockReset().mockResolvedValue({
      ok: true,
      text: 'Cloud text here',
      model: 'gemini-x',
      durationMs: 800,
    });
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

  it('reads photos imported from the gallery', async () => {
    mockPickImages.mockResolvedValue({ status: 'success', imageUris: ['file:///photo.jpg'] });
    mockRecognizeText.mockResolvedValue({
      ok: true,
      recognition: makeRecognition([{ text: 'From gallery', confidence: 0.9 }]),
    });
    const user = userEvent.setup();
    await render(<OcrLabScreen />);

    await user.press(screen.getByRole('button', { name: 'Import from gallery' }));

    expect(await screen.findByText('From gallery')).toBeOnTheScreen();
    expect(mockRecognizeText).toHaveBeenCalledWith('file:///photo.jpg');
    expect(mockScanPages).not.toHaveBeenCalled();
  });

  it('shows the cloud result next to the on-device one', async () => {
    mockScanPages.mockResolvedValue({ status: 'success', imageUris: ['file:///a.jpg'] });
    mockRecognizeText.mockResolvedValue({
      ok: true,
      recognition: makeRecognition([{ text: 'Local text', confidence: 0.9 }]),
    });
    const user = userEvent.setup();
    await render(<OcrLabScreen />);

    await user.press(screen.getByRole('button', { name: 'Scan pages' }));

    expect(await screen.findByText('Cloud text here')).toBeOnTheScreen();
    expect(screen.getByText('Local text')).toBeOnTheScreen();
    expect(screen.getByText('Cloud (gemini-x)')).toBeOnTheScreen();
    expect(mockCloud).toHaveBeenCalledWith('file:///a.jpg');
  });

  it('shows a cloud failure without hiding the on-device result', async () => {
    mockCloud.mockResolvedValue({ ok: false, code: 'unavailable' });
    mockScanPages.mockResolvedValue({ status: 'success', imageUris: ['file:///a.jpg'] });
    mockRecognizeText.mockResolvedValue({
      ok: true,
      recognition: makeRecognition([{ text: 'Local text', confidence: 0.9 }]),
    });
    const user = userEvent.setup();
    await render(<OcrLabScreen />);

    await user.press(screen.getByRole('button', { name: 'Scan pages' }));

    expect(
      await screen.findByText('The cloud engine is not set up on the server yet.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Local text')).toBeOnTheScreen();
  });
});
