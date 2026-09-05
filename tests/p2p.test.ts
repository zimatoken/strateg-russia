import { describe, expect, it, vi, beforeEach } from 'vitest';
import { P2PTransport, createOfferFor, acceptOffer } from '../src/core/p2p';

class MockDataChannel {
  binaryType = 'arraybuffer';
  readyState = 'open';
  send = vi.fn();
  close = vi.fn();
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
}

class MockPeerConnection {
  static instances: MockPeerConnection[] = [];

  localDescription: any = null;
  onicecandidate: ((event: any) => void) | null = null;
  ondatachannel: ((event: any) => void) | null = null;
  createDataChannel = vi.fn(() => {
    const channel = new MockDataChannel();
    this.dataChannel = channel;
    return channel;
  });

  dataChannel: MockDataChannel | null = null;
  createOffer = vi.fn(async () => ({ type: 'offer', sdp: 'offer-sdp' }));
  createAnswer = vi.fn(async () => ({ type: 'answer', sdp: 'answer-sdp' }));
  setLocalDescription = vi.fn(async (description: any) => {
    this.localDescription = description;
  });
  setRemoteDescription = vi.fn(async () => undefined);
  close = vi.fn();

  constructor() {
    MockPeerConnection.instances.push(this);
  }
}

beforeEach(() => {
  (globalThis as any).RTCPeerConnection = MockPeerConnection;
  (globalThis as any).RTCSessionDescription = class {
    constructor(public init: any) { Object.assign(this, init); }
  };
  MockPeerConnection.instances = [];
});

describe('P2P signaling flow', () => {
  it('emits QR payload when a local offer is created', async () => {
    const transport = new P2PTransport('peer-a');
    const onGenerated = vi.fn();
    transport.onQRGenerated(onGenerated);

    await transport.connect();

    expect(onGenerated).toHaveBeenCalled();
    const payload = onGenerated.mock.calls[0][0];
    expect(payload).toContain('"type":"offer"');
    expect(payload).toContain('offer-sdp');
  });

  it('acceptOffer creates a transport and applies the incoming SDP', async () => {
    const transport = await acceptOffer(JSON.stringify({ type: 'offer', sdp: 'remote-offer', peerId: 'peer-b' }));

    expect(transport).toBeTruthy();
    expect(MockPeerConnection.instances.length).toBeGreaterThan(0);
  });

  it('createOfferFor resolves a QR SDP string', async () => {
    const payload = await createOfferFor('peer-c');
    expect(payload).toContain('"type":"offer"');
  });
});
