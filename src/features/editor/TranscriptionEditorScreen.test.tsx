import { act, render, screen, userEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { makeRecognition } from '@/features/ocr/fixtures';

import { TranscriptionEditorScreen } from './TranscriptionEditorScreen';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockSetDraft = jest.fn();
const mockRecognize = jest.fn();
const mockCloud = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack, push: mockPush }) }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('@/features/profile/ProfileButton', () => ({ ProfileButton: () => null }));
jest.mock('./FilingDraftProvider', () => ({
  useFilingDraft: () => ({ draft: null, setDraft: mockSetDraft }),
}));
jest.mock('@/features/ocr/ocrService', () => ({
  recognizeText: (uri: string) => mockRecognize(uri),
}));
jest.mock('@/features/ocr/cloudOcrService', () => ({
  ...jest.requireActual('@/features/ocr/cloudOcrService'),
  recognizeTextInCloud: (uri: string) => mockCloud(uri),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const deviceRecognition = makeRecognition([
  { text: 'On device ﬁrst line', confidence: 0.8 },
  { text: 'second   line', confidence: 0.9 },
]);

async function renderEditor() {
  const device = deferred<unknown>();
  const cloud = deferred<unknown>();
  mockRecognize.mockReturnValue(device.promise);
  mockCloud.mockReturnValue(cloud.promise);
  await render(<TranscriptionEditorScreen imageUri="file:///page.jpg" />);
  return {
    device: (value: unknown) => act(async () => device.resolve(value)),
    cloud: (value: unknown) => act(async () => cloud.resolve(value)),
  };
}

describe('TranscriptionEditorScreen', () => {
  beforeEach(() => {
    mockBack.mockReset();
    mockPush.mockReset();
    mockSetDraft.mockReset();
    mockRecognize.mockReset();
    mockCloud.mockReset();
  });

  it('shows on-device text with its confidence first, then swaps in the cloud text', async () => {
    const engines = await renderEditor();
    expect(screen.getByText('Reading your page…')).toBeOnTheScreen();

    await engines.device({ ok: true, recognition: deviceRecognition });
    expect(screen.getByLabelText('Transcription text')).toHaveDisplayValue(/On device/);
    expect(screen.getByText('83.8% CONF')).toBeOnTheScreen();
    expect(screen.getByText('1000x1400')).toBeOnTheScreen();
    expect(screen.getByText('Improving the text with cloud reading…')).toBeOnTheScreen();

    await engines.cloud({
      ok: true,
      text: 'Cloud transcription',
      model: 'gemini-x',
      durationMs: 5,
    });
    expect(screen.getByLabelText('Transcription text')).toHaveDisplayValue('Cloud transcription');
    expect(screen.getByText('CLOUD TEXT')).toBeOnTheScreen();
    expect(screen.queryByText(/% CONF/)).toBeNull();
    expect(screen.getByText('Transcription ready')).toBeOnTheScreen();
  });

  it('keeps the on-device text and offers a retry when the cloud fails', async () => {
    const engines = await renderEditor();
    await engines.device({ ok: true, recognition: deviceRecognition });
    await engines.cloud({ ok: false, code: 'network' });

    expect(await screen.findByRole('alert')).toHaveTextContent(/Showing the on-device text/);
    expect(screen.getByLabelText('Transcription text')).toHaveDisplayValue(/On device/);

    mockCloud.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Retry cloud reading' }));
    expect(mockCloud).toHaveBeenCalledTimes(2);
  });

  it('fixes ligatures and trims spaces on request', async () => {
    const engines = await renderEditor();
    await engines.device({ ok: true, recognition: deviceRecognition });
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Fix ligatures' }));
    expect(screen.getByLabelText('Transcription text')).toHaveDisplayValue(/first line/);

    await user.press(screen.getByRole('button', { name: 'Trim spaces' }));
    expect(screen.getByLabelText('Transcription text')).toHaveDisplayValue(
      'On device first line\nsecond line',
    );
    expect(screen.getByText('Edited')).toBeOnTheScreen();
  });

  it('offers cloud text instead of overwriting edits', async () => {
    const engines = await renderEditor();
    await engines.device({ ok: true, recognition: deviceRecognition });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Transcription text'), ' my fix');

    await engines.cloud({ ok: true, text: 'Cloud transcription', model: 'm', durationMs: 5 });
    expect(screen.getByLabelText('Transcription text')).toHaveDisplayValue(/my fix/);

    await user.press(screen.getByRole('button', { name: 'Use cloud text' }));
    expect(screen.getByLabelText('Transcription text')).toHaveDisplayValue('Cloud transcription');
  });

  it('hands the confirmed text to filing', async () => {
    const engines = await renderEditor();
    await engines.device({ ok: true, recognition: deviceRecognition });
    await engines.cloud({ ok: false, code: 'network' });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Index tag or metadata notes'), ' from 1890 ed. ');

    await user.press(screen.getByRole('button', { name: 'Confirm & assign category' }));

    expect(mockSetDraft).toHaveBeenCalledWith({
      imageUri: 'file:///page.jpg',
      text: 'On device ﬁrst line\nsecond   line',
      memo: 'from 1890 ed.',
      engine: 'on_device',
      confidence: expect.closeTo(0.838, 2),
      imageWidth: 1000,
      imageHeight: 1400,
    });
    expect(mockPush).toHaveBeenCalledWith('/filing');
  });

  it('cannot continue without any text', async () => {
    const engines = await renderEditor();
    await engines.device({ ok: false, code: 'unavailable' });
    await engines.cloud({ ok: false, code: 'unavailable' });

    expect(screen.getByText('No text found')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Confirm & assign category' })).toBeDisabled();
  });

  it('leaves without asking when nothing was edited', async () => {
    const engines = await renderEditor();
    await engines.device({ ok: true, recognition: deviceRecognition });
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Discard / Retake' }));
    expect(mockBack).toHaveBeenCalled();
  });

  it('asks before discarding edits', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const engines = await renderEditor();
    await engines.device({ ok: true, recognition: deviceRecognition });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Transcription text'), 'x');

    await user.press(screen.getByRole('button', { name: 'Go back' }));

    expect(alert).toHaveBeenCalledWith('Discard this page?', expect.any(String), expect.any(Array));
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('shows the page overlay with a note about uncertain lines', async () => {
    const engines = await renderEditor();
    await engines.device({
      ok: true,
      recognition: makeRecognition([
        { text: 'Clear', confidence: 0.95 },
        { text: 'Smudged', confidence: 0.3 },
      ]),
    });
    const user = userEvent.setup();

    await user.press(screen.getByRole('tab', { name: 'Image Overlay' }));

    expect(
      screen.getByText(/1 outlined with a dashed amber box may need checking/),
    ).toBeOnTheScreen();
  });
});
