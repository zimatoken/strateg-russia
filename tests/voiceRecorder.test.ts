import { beforeEach, describe, expect, it, vi } from 'vitest';

class MockMediaRecorder {
  static isTypeSupported = vi.fn(() => true);
  public ondataavailable: ((event: { data: Blob }) => void) | null = null;
  public onstop: (() => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public start = vi.fn();
  public stop = vi.fn(() => {
    this.onstop?.(); 
  });

  constructor(_stream: MediaStream, _options?: MediaRecorderOptions) {}
}

describe('VoiceRecorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });

    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      writable: true,
      value: MockMediaRecorder,
    });
  });

  it('starts and stops recording using MediaRecorder', async () => {
    const { VoiceRecorder } = await import('../src/core/voiceRecorder');
    const recorder = new VoiceRecorder();
    const onDataAvailable = vi.fn();

    recorder.onDataAvailable = onDataAvailable;

    await recorder.start();
    recorder.stop();

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    expect(onDataAvailable).toHaveBeenCalled();
  });

  it('reports support when MediaRecorder and getUserMedia are available', async () => {
    const { VoiceRecorder } = await import('../src/core/voiceRecorder');
    expect(VoiceRecorder.isSupported()).toBe(true);
  });
});
