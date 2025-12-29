# KQTT Transport

Unified transport manager for all P2P methods.

```javascript
/**
 * @udt KQTTTransport
 * Multi-transport manager
 */
class KQTTTransport {
  constructor(kqtt) {
    this.kqtt = kqtt;
    this.transports = { local: null, webrtc: null, torrent: null };
    this.activeTransport = null;
  }

  initLocal(channelName) {
    this.transports.local = new GS.KQTTLocalBridge(this.kqtt, channelName);
    console.log('[KQTT Transport] Local bridge initialized');
  }

  initWebRTC() {
    this.transports.webrtc = new GS.KQTTSignaling(this.kqtt);
    console.log('[KQTT Transport] WebRTC signaling initialized');
    return this.transports.webrtc;
  }

  async initTorrent(roomCode, isHost = false) {
    if (!GS.KQTTTorrent.isAvailable()) { console.warn('[KQTT Transport] WebTorrent not available'); return null; }
    this.transports.torrent = new GS.KQTTTorrent(this.kqtt);
    const result = isHost ? await this.transports.torrent.join(roomCode) : await this.transports.torrent.connect(roomCode);
    this.activeTransport = 'torrent';
    return result;
  }

  publish(topic, payload, options = {}) {
    this.kqtt.publish(topic, payload, options);
    if (this.transports.local) this.transports.local.publish(topic, payload, options);
    if (this.transports.torrent?.ready) {
      this.transports.torrent.broadcast({ type: 'PUBLISH', topic, payload, from: this.kqtt.peerId, ts: Date.now() });
    }
  }

  getStats() {
    return {
      kqtt: this.kqtt.getStats(),
      local: this.transports.local ? { peers: this.transports.local.localPeers.size } : null,
      torrent: this.transports.torrent?.getStats() || null,
      activeTransport: this.activeTransport
    };
  }

  close() {
    this.transports.local?.close();
    this.transports.torrent?.close();
    this.kqtt.close();
  }
}

GS.KQTTTransport = KQTTTransport;
```
