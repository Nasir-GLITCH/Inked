import { ImageManipulator } from 'expo-image-manipulator';

import { MAX_UPLOAD_EDGE, prepareImageForUpload } from './imagePrep';

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { JPEG: 'jpeg' },
}));

const manipulate = jest.mocked(ImageManipulator.manipulate);

describe('prepareImageForUpload', () => {
  beforeEach(() => manipulate.mockReset());

  it('returns a smaller JPEG copy, decoded at the size limit', async () => {
    const saveAsync = jest.fn().mockResolvedValue({ uri: 'file:///small.jpg' });
    manipulate.mockReturnValue({
      renderAsync: jest.fn().mockResolvedValue({ saveAsync }),
    } as unknown as ReturnType<typeof ImageManipulator.manipulate>);

    await expect(prepareImageForUpload('file:///big.jpg')).resolves.toBe('file:///small.jpg');
    expect(manipulate).toHaveBeenCalledWith('file:///big.jpg', {
      maxWidth: MAX_UPLOAD_EDGE,
      maxHeight: MAX_UPLOAD_EDGE,
    });
    expect(saveAsync).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.8 });
  });

  it('falls back to the original image when shrinking fails', async () => {
    manipulate.mockImplementation(() => {
      throw new Error('native failure');
    });
    await expect(prepareImageForUpload('file:///big.jpg')).resolves.toBe('file:///big.jpg');
  });
});
