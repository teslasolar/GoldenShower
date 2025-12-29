# KQTT Core

Base P2P mesh with MQTT semantics over WebRTC.

```javascript
/**
 * @udt KQTT
 * @base EventEmitter
 * Core P2P pub/sub mesh network
 */
class KQTT {
  constructor() {
    this.peerId = this._genId();
    this.peers = new Map();
    this.subscriptions = new Map();
    this.retained = new Map();
    this.pendingAcks = new Map();
    this.seenMessages = new Set();
    this.events = {};
    this.stats = { sent: 0, received: 0, peers: 0 };
    this._msgSeq = 0;
    this._pendingConnections = new Map();
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ];
    setInterval(() => {
      if (this.seenMessages.size > 10000) this.seenMessages.clear();
    }, 60000);
  }

  _genId() { return Math.random().toString(36).substr(2, 8); }
  _genMsgId() { return `${this.peerId}-${++this._msgSeq}-${Date.now()}`; }

  on(e, fn) { (this.events[e] = this.events[e] || []).push(fn); }
  emit(e, d) { (this.events[e] || []).forEach(fn => fn(d)); }
  off(e, fn) { if (this.events[e]) this.events[e] = this.events[e].filter(f => f !== fn); }

  getStats() {
    return { ...this.stats, peerId: this.peerId, subscriptions: this.subscriptions.size };
  }

  close() {
    for (const [peerId] of this.peers) this._removePeer(peerId);
    this.subscriptions.clear();
    this.retained.clear();
  }
}

GS.KQTT = KQTT;
```
