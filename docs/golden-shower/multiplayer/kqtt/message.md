# KQTT Message

Message handling and forwarding.

```javascript
/**
 * @udt KQTT.message
 * @extends KQTT
 * Message handling and forwarding
 */
Object.assign(GS.KQTT.prototype, {
  _handleMessage(fromPeer, data) {
    try {
      const msg = JSON.parse(data);
      const peer = this.peers.get(fromPeer);
      if (peer) peer.lastSeen = Date.now();
      if (msg.msgId && this.seenMessages.has(msg.msgId)) return;
      if (msg.msgId) this.seenMessages.add(msg.msgId);
      switch (msg.type) {
        case 'PUBLISH': this._handlePublish(fromPeer, msg); break;
        case 'PUBACK': this._handlePuback(msg); break;
        case 'ANNOUNCE': this.emit('peer-announce', { peerId: msg.peerId, from: fromPeer }); break;
        case 'PING': this._sendToPeer(fromPeer, JSON.stringify({ type: 'PONG', ts: msg.ts })); break;
        case 'PONG': this.emit('pong', { peerId: fromPeer, latency: Date.now() - msg.ts }); break;
      }
    } catch (e) { console.warn('[KQTT] Parse error:', e); }
  },

  _handlePuback(msg) {
    const pending = this.pendingAcks.get(msg.msgId);
    if (pending) { clearTimeout(pending.timeout); pending.resolve(); this.pendingAcks.delete(msg.msgId); }
  },

  _forward(fromPeer, msg) {
    const data = JSON.stringify(msg);
    for (const [peerId] of this.peers) {
      if (peerId !== fromPeer) this._sendToPeer(peerId, data);
    }
  }
});
```
