import { makeRecognition } from '@/features/ocr/fixtures';

import {
  draftConfidence,
  draftReducer,
  initialDraft,
  isDraftBusy,
  type DraftAction,
  type DraftState,
} from './draftReducer';

const recognition = makeRecognition([{ text: 'On device text', confidence: 0.8 }]);

function run(actions: DraftAction[], start: DraftState = initialDraft): DraftState {
  return actions.reduce(draftReducer, start);
}

describe('draftReducer', () => {
  it('shows the on-device text first, then replaces it with the cloud text', () => {
    const afterDevice = run([{ type: 'onDeviceDone', recognition }]);
    expect(afterDevice).toMatchObject({ text: recognition.text, baseEngine: 'on_device' });

    const afterCloud = draftReducer(afterDevice, {
      type: 'cloudDone',
      text: 'Cloud text',
      model: 'm',
    });
    expect(afterCloud).toMatchObject({
      text: 'Cloud text',
      baseEngine: 'cloud',
      cloudOffered: false,
    });
  });

  it('does not let a late on-device result replace cloud text', () => {
    const state = run([
      { type: 'cloudDone', text: 'Cloud text', model: 'm' },
      { type: 'onDeviceDone', recognition },
    ]);
    expect(state).toMatchObject({ text: 'Cloud text', baseEngine: 'cloud' });
  });

  it('offers cloud text instead of overwriting the user edits', () => {
    const state = run([
      { type: 'onDeviceDone', recognition },
      { type: 'edit', text: 'My own fix' },
      { type: 'cloudDone', text: 'Cloud text', model: 'm' },
    ]);
    expect(state).toMatchObject({ text: 'My own fix', edited: true, cloudOffered: true });

    const accepted = draftReducer(state, { type: 'useCloudText' });
    expect(accepted).toMatchObject({
      text: 'Cloud text',
      baseEngine: 'cloud',
      edited: false,
      cloudOffered: false,
    });
  });

  it('ignores an empty cloud result when on-device text exists', () => {
    const state = run([
      { type: 'onDeviceDone', recognition },
      { type: 'cloudDone', text: '  ', model: 'm' },
    ]);
    expect(state).toMatchObject({ text: recognition.text, baseEngine: 'on_device' });
  });

  it('keeps the on-device text when the cloud fails, and can retry', () => {
    const failed = run([
      { type: 'onDeviceDone', recognition },
      { type: 'cloudFailed', code: 'network' },
    ]);
    expect(failed).toMatchObject({
      text: recognition.text,
      cloud: { status: 'failed', code: 'network' },
    });
    expect(draftReducer(failed, { type: 'cloudRetry' }).cloud).toEqual({ status: 'running' });
  });

  it('does nothing for useCloudText before the cloud text exists', () => {
    expect(draftReducer(initialDraft, { type: 'useCloudText' })).toBe(initialDraft);
  });

  it('reports busy until both engines have finished', () => {
    expect(isDraftBusy(initialDraft)).toBe(true);
    expect(isDraftBusy(run([{ type: 'onDeviceDone', recognition }]))).toBe(true);
    expect(
      isDraftBusy(
        run([
          { type: 'onDeviceFailed', code: 'unavailable' },
          { type: 'cloudFailed', code: 'network' },
        ]),
      ),
    ).toBe(false);
  });

  it('gives a confidence only for on-device text', () => {
    const device = run([{ type: 'onDeviceDone', recognition }]);
    expect(draftConfidence(device)).toBeCloseTo(0.8);
    const cloud = draftReducer(device, { type: 'cloudDone', text: 'Cloud', model: 'm' });
    expect(draftConfidence(cloud)).toBeNull();
    expect(draftConfidence(initialDraft)).toBeNull();
  });
});
