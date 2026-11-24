import { scaleFrame } from './overlayGeometry';

const frame = { left: 100, top: 200, right: 300, bottom: 260 };

describe('scaleFrame', () => {
  it('scales a frame to the display width', () => {
    expect(scaleFrame(frame, 1000, 500)).toEqual({ left: 50, top: 100, width: 100, height: 30 });
  });

  it('returns null when the image or display has no size', () => {
    expect(scaleFrame(frame, 0, 500)).toBeNull();
    expect(scaleFrame(frame, 1000, 0)).toBeNull();
  });

  it('returns null for an empty or inverted frame', () => {
    expect(scaleFrame({ left: 5, top: 5, right: 5, bottom: 9 }, 100, 100)).toBeNull();
    expect(scaleFrame({ left: 9, top: 5, right: 5, bottom: 9 }, 100, 100)).toBeNull();
  });
});
