import * as ImagePicker from 'expo-image-picker';

import { pickImages } from './imageImport';

jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

const launch = jest.mocked(ImagePicker.launchImageLibraryAsync);

describe('pickImages', () => {
  beforeEach(() => launch.mockReset());

  it('returns the picked image uris, limited to the requested count', async () => {
    launch.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///a.jpg' }, { uri: 'file:///b.jpg' }],
    } as ImagePicker.ImagePickerResult);

    await expect(pickImages(3)).resolves.toEqual({
      status: 'success',
      imageUris: ['file:///a.jpg', 'file:///b.jpg'],
    });
    expect(launch).toHaveBeenCalledWith(
      expect.objectContaining({ allowsMultipleSelection: true, selectionLimit: 3 }),
    );
  });

  it('reports cancellation', async () => {
    launch.mockResolvedValue({ canceled: true, assets: null });
    await expect(pickImages()).resolves.toEqual({ status: 'cancelled' });
  });

  it('reports a failure instead of throwing', async () => {
    launch.mockRejectedValue(new Error('no picker'));
    await expect(pickImages()).resolves.toEqual({ status: 'error', code: 'failed' });
  });
});
