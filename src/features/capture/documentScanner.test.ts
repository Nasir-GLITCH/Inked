import { MAX_SCAN_PAGES, scanFailureMessage, scanPages } from './documentScanner';

const mockScanDocument = jest.fn();

jest.mock('react-native-document-scanner-plugin', () => ({
  __esModule: true,
  default: { scanDocument: (...args: unknown[]) => mockScanDocument(...args) },
  ResponseType: { ImageFilePath: 'imageFilePath' },
  ScanDocumentResponseStatus: { Success: 'success', Cancel: 'cancel' },
}));

describe('scanPages', () => {
  beforeEach(() => mockScanDocument.mockReset());

  it('returns the scanned image paths', async () => {
    mockScanDocument.mockResolvedValue({
      status: 'success',
      scannedImages: ['file:///a.jpg', 'file:///b.jpg'],
    });
    await expect(scanPages()).resolves.toEqual({
      status: 'success',
      imageUris: ['file:///a.jpg', 'file:///b.jpg'],
    });
    expect(mockScanDocument).toHaveBeenCalledWith(
      expect.objectContaining({ maxNumDocuments: MAX_SCAN_PAGES, responseType: 'imageFilePath' }),
    );
  });

  it('reports cancellation', async () => {
    mockScanDocument.mockResolvedValue({ status: 'cancel' });
    await expect(scanPages()).resolves.toEqual({ status: 'cancelled' });
  });

  it('treats a success with no images as cancelled', async () => {
    mockScanDocument.mockResolvedValue({ status: 'success', scannedImages: [] });
    await expect(scanPages()).resolves.toEqual({ status: 'cancelled' });
  });

  it('reports a failure instead of throwing', async () => {
    mockScanDocument.mockRejectedValue(new Error('camera busy'));
    await expect(scanPages()).resolves.toEqual({ status: 'error', code: 'failed' });
  });

  it('has a message for every failure code', () => {
    expect(scanFailureMessage('unavailable')).not.toBe('');
    expect(scanFailureMessage('failed')).not.toBe('');
  });
});
