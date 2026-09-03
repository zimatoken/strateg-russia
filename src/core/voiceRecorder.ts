export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime = 0;

  onDataAvailable: ((blob: Blob, duration: number) => void) | null = null;
  onError: ((err: Error) => void) | null = null;

  async start(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.chunks = [];
      this.startTime = Date.now();

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' });
        const duration = Date.now() - this.startTime;
        this.onDataAvailable?.(blob, duration);
        this.cleanup();
      };

      this.mediaRecorder.onerror = () => {
        this.onError?.(new Error('MediaRecorder error'));
      };

      this.mediaRecorder.start(100);
    } catch (error) {
      this.onError?.(error as Error);
    }
  }

  stop(): void {
    this.mediaRecorder?.stop();
  }

  private cleanup(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.mediaRecorder = null;
  }

  static isSupported(): boolean {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') {
      return false;
    }

    const mediaDevices = navigator.mediaDevices as MediaDevices | undefined;
    return Boolean(
      mediaDevices?.getUserMedia &&
      typeof window.MediaRecorder !== 'undefined' &&
      typeof MediaRecorder !== 'undefined' &&
      MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    );
  }
}
