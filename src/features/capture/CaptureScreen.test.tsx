import { render, screen, userEvent } from '@testing-library/react-native';

import { CaptureScreen } from './CaptureScreen';

const mockPush = jest.fn();
const mockScanPages = jest.fn();
const mockPickImages = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, navigate: jest.fn() }) }));
jest.mock('@/features/profile/ProfileButton', () => ({ ProfileButton: () => null }));
jest.mock('./documentScanner', () => ({
  scanPages: (...args: unknown[]) => mockScanPages(...args),
  scanFailureMessage: () => 'The page scanner is not available in this build of the app.',
}));
jest.mock('./imageImport', () => ({ pickImages: (...args: unknown[]) => mockPickImages(...args) }));

describe('CaptureScreen', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockScanPages.mockReset();
    mockPickImages.mockReset();
  });

  it('opens the editor with the scanned page', async () => {
    mockScanPages.mockResolvedValue({ status: 'success', imageUris: ['file:///scan.jpg'] });
    const user = userEvent.setup();
    await render(<CaptureScreen />);

    await user.press(screen.getByRole('button', { name: 'Scan page' }));

    expect(mockScanPages).toHaveBeenCalledWith(1);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/editor',
      params: { imageUri: 'file:///scan.jpg' },
    });
  });

  it('opens the editor with an imported photo', async () => {
    mockPickImages.mockResolvedValue({ status: 'success', imageUris: ['file:///photo.jpg'] });
    const user = userEvent.setup();
    await render(<CaptureScreen />);

    await user.press(screen.getByRole('button', { name: 'Import from gallery' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/editor',
      params: { imageUri: 'file:///photo.jpg' },
    });
  });

  it('stays on the screen when the user cancels', async () => {
    mockScanPages.mockResolvedValue({ status: 'cancelled' });
    const user = userEvent.setup();
    await render(<CaptureScreen />);

    await user.press(screen.getByRole('button', { name: 'Scan page' }));

    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('announces an error when the scanner cannot open', async () => {
    mockScanPages.mockResolvedValue({ status: 'error', code: 'unavailable' });
    const user = userEvent.setup();
    await render(<CaptureScreen />);

    await user.press(screen.getByRole('button', { name: 'Scan page' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/not available in this build/);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('tells the user that page images are sent to Google', async () => {
    await render(<CaptureScreen />);
    expect(screen.getByText(/sent to Google/)).toBeOnTheScreen();
  });
});
