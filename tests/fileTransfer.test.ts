import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  CHUNK_SIZE,
  MAX_FILE_SIZE,
  MAX_FILES,
  MAX_MESSAGE_SIZE,
  ZimaDialogCore,
  chunkString,
  fileToBase64,
  isAllowedFileType,
  isAllowedFile,
} from '../src/core/dialogCore';
import { MockWebSocket, installMockWebSocket, resetMockWebSockets } from './mocks/ws';

vi.mock('../src/core/db', () => ({
  openDB: vi.fn().mockResolvedValue(undefined),
  saveMessage: vi.fn().mockResolvedValue(undefined),
  getMessages: vi.fn().mockResolvedValue([]),
  markMessageDelivered: vi.fn().mockResolvedValue(undefined),
  deleteOldMessages: vi.fn().mockResolvedValue(0),
}));

vi.mock('../src/core/broadcast', () => ({
  initBroadcast: vi.fn(),
  sendBroadcast: vi.fn(),
  onBroadcast: vi.fn(() => () => {}),
  closeBroadcast: vi.fn(),
}));

describe('file transfer helpers', () => {
  it('exports file transfer constants', () => {
    expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    expect(MAX_FILES).toBe(3);
    expect(CHUNK_SIZE).toBe(16 * 1024);
    expect(MAX_MESSAGE_SIZE).toBe(10 * 1024);
  });

  it('chunkString splits string into fixed-size chunks', () => {
    expect(chunkString('abcdef', 2)).toEqual(['ab', 'cd', 'ef']);
    expect(chunkString('', 4)).toEqual([]);
  });

  it('isAllowedFileType validates mime types', () => {
    expect(isAllowedFileType('image/png')).toBe(true);
    expect(isAllowedFileType('text/plain')).toBe(true);
    expect(isAllowedFileType('application/pdf')).toBe(true);
    expect(isAllowedFileType('application/zip')).toBe(true);
  });

  it('isAllowedFile validates by extension when MIME is empty', () => {
    const zip = new File(['zip'], 'archive.zip', { type: '' });
    const exe = new File(['bad'], 'virus.exe', { type: '' });
    expect(isAllowedFile(zip)).toBe(true);
    expect(isAllowedFile(exe)).toBe(false);
  });

  it('fileToBase64 converts file content to base64', async () => {
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    const base64 = await fileToBase64(file);
    expect(base64).toBe(btoa('hello'));
  });
});

describe('ZimaDialogCore file messages', () => {
  let core: ZimaDialogCore;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    resetMockWebSockets();
    installMockWebSocket();
    core = new ZimaDialogCore();
  });

  afterEach(() => {
    core.disconnect();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('sendMessage attaches files and sends encoded payload', async () => {
    vi.useRealTimers();
    await core.connect();
    const ws = MockWebSocket.getLatest();
    ws.simulateOpen();

    const file = new File(['image-data'], 'photo.png', { type: 'image/png' });
    await core.sendMessage('ZIMA-TARGETAAA', 'See attachment', [file]);

    const localMessage = core.getMessages()[0];
    expect(localMessage.text).toBe('See attachment');
    expect(localMessage.files).toHaveLength(1);
    expect(localMessage.files?.[0].name).toBe('photo.png');

    const sent = JSON.parse(ws.sentMessages.find(m => JSON.parse(m).type === 'SEND')!);
    const payload = JSON.parse(atob(sent.payload));
    expect(payload.files).toHaveLength(1);
    expect(payload.text).toBe('See attachment');
  });

  it('rejects too many files', async () => {
    await core.connect();
    MockWebSocket.getLatest().simulateOpen();

    const errors: string[] = [];
    core.onError(error => errors.push(error));

    const files = Array.from({ length: MAX_FILES + 1 }, (_, i) =>
      new File(['x'], `file-${i}.txt`, { type: 'text/plain' })
    );

    await core.sendMessage('ZIMA-TARGETAAA', 'files', files);
    expect(errors[0]).toContain('Слишком много файлов');
    expect(core.getMessages()).toHaveLength(0);
  });

  it('rejects disallowed file types', async () => {
    await core.connect();
    MockWebSocket.getLatest().simulateOpen();

    const errors: string[] = [];
    core.onError(error => errors.push(error));

    const file = new File(['bad'], 'virus.exe', { type: 'application/x-msdownload' });
    await core.sendMessage('ZIMA-TARGETAAA', 'bad file', [file]);

    expect(errors[0]).toContain('Недопустимый тип файла');
    expect(core.getMessages()).toHaveLength(0);
  });

  it('accepts zip attachments', async () => {
    vi.useRealTimers();
    await core.connect();
    const ws = MockWebSocket.getLatest();
    ws.simulateOpen();

    const file = new File(['zip'], 'archive.zip', { type: 'application/zip' });
    await core.sendMessage('ZIMA-TARGETAAA', '', [file]);

    expect(core.getMessages()[0].files?.[0].name).toBe('archive.zip');
    expect(ws.sentMessages.some(m => JSON.parse(m).type === 'SEND')).toBe(true);
  });

  it('sends CHUNK messages for large payloads', async () => {
    vi.useRealTimers();
    await core.connect();
    const ws = MockWebSocket.getLatest();
    ws.simulateOpen();

    const payloadObj = {
      type: 'MESSAGE',
      id: 'large-msg-1',
      chatId: 'ZIMA-TARGETAAA',
      senderId: core.getConnectionState().currentStrategId,
      text: 'x'.repeat(MAX_MESSAGE_SIZE),
      timestamp: Date.now(),
    };
    const encoded = btoa(JSON.stringify(payloadObj));
    expect(encoded.length).toBeGreaterThan(MAX_MESSAGE_SIZE);

    const file = new File(['small'], 'note.txt', { type: 'text/plain' });
    await core.sendMessage('ZIMA-TARGETAAA', 'x'.repeat(MAX_MESSAGE_SIZE), [file]);

    const chunkMessages = ws.sentMessages
      .map(m => JSON.parse(m))
      .filter(m => m.type === 'CHUNK');
    const completeMessages = ws.sentMessages
      .map(m => JSON.parse(m))
      .filter(m => m.type === 'CHUNK_COMPLETE');

    expect(chunkMessages.length).toBeGreaterThan(0);
    expect(completeMessages).toHaveLength(1);
    expect(ws.sentMessages.some(m => JSON.parse(m).type === 'SEND')).toBe(false);
  });

  it('assembles incoming chunked messages with files', async () => {
    await core.connect();
    const ws = MockWebSocket.getLatest();
    ws.simulateOpen();

    const payloadObj = {
      type: 'MESSAGE',
      id: 'chunk-msg-1',
      chatId: 'ZIMA-TARGETAAA',
      senderId: 'ZIMA-SENDERAA',
      text: 'chunked',
      files: [{ name: 'a.txt', type: 'text/plain', size: 3, data: btoa('abc') }],
      timestamp: 1234,
    };
    const encoded = btoa(JSON.stringify(payloadObj));
    const chunks = chunkString(encoded, CHUNK_SIZE);

    chunks.forEach((data, chunkIndex) => {
      ws.simulateMessage({
        type: 'CHUNK',
        messageId: 'chunk-msg-1',
        chunkIndex,
        totalChunks: chunks.length,
        data,
        chatId: 'ZIMA-TARGETAAA',
        senderId: 'ZIMA-SENDERAA',
      });
    });

    ws.simulateMessage({
      type: 'CHUNK_COMPLETE',
      messageId: 'chunk-msg-1',
      chatId: 'ZIMA-TARGETAAA',
      senderId: 'ZIMA-SENDERAA',
    });

    const message = core.getMessages()[0];
    expect(message.id).toBe('chunk-msg-1');
    expect(message.text).toBe('chunked');
    expect(message.files?.[0].name).toBe('a.txt');
  });

  it('parses incoming MESSAGE payload with files', async () => {
    await core.connect();
    const ws = MockWebSocket.getLatest();
    ws.simulateOpen();

    const payloadObj = {
      type: 'MESSAGE',
      id: 'file-msg-1',
      chatId: 'ZIMA-TARGETAAA',
      senderId: 'ZIMA-SENDERAA',
      text: 'with file',
      files: [{ name: 'doc.pdf', type: 'application/pdf', size: 4, data: btoa('pdf') }],
      timestamp: 5678,
    };

    ws.simulateMessage({
      type: 'MESSAGE',
      id: 'file-msg-1',
      from: 'ZIMA-SENDERAA',
      payload: btoa(JSON.stringify(payloadObj)),
      timestamp: 5678,
    });

    const message = core.getMessages()[0];
    expect(message.text).toBe('with file');
    expect(message.files?.[0].type).toBe('application/pdf');
  });
});
