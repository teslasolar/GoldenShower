# KQTT Peer

Peer management and messaging.

```javascript
/**
 * @udt KQTT.peer
 * @extends KQTT
 * Peer add/remove and send
 */
Object.assign(GS.KQTT.prototype, {
  _addPeer(peerId, conn, channel) {
    const peer = { conn, channel, state: 'connected', connectedAt: Date.now(), lastSeen: Date.now() };
    channel.onmessage = (e) => this._handleMessage(peerId, e.data);
    channel.onclose = () => this._removePeer(peerId);
    channel.onerror = () => this._removePeer(peerId);
    conn.oniceconnectionstatechange = () => {
      if (conn.iceConnectionState === 'disconnected' || conn.iceConnectionState === 'failed') {
        this._removePeer(peerId);
      }
    };
    this.peers.set(peerId, peer);
    this.stats.peers = this.peers.size;
    this.emit('peer-join', { peerId });
    for (const [topic, msg] of this.retained) {
      this._sendToPeer(peerId, JSON.stringify({ type: 'PUBLISH', ...msg, retain: true }));
    }
    this._sendToPeer(peerId, JSON.stringify({ type: 'ANNOUNCE', peerId: this.peerId, timestamp: Date.now() }));
  },

  _removePeer(peerId) {
    const peer = this.peers.get(peerId);
    if (peer) {
      try { peer.channel.close(); } catch {}
      try { peer.conn.close(); } catch {}
      this.peers.delete(peerId);
      this.stats.peers = this.peers.size;
      this.emit('peer-leave', { peerId });
    }
  },

  _sendToPeer(peerId, data) {
    const peer = this.peers.get(peerId);
    if (peer?.channel.readyState === 'open') {
      try { peer.channel.send(data); return true; } catch { return false; }
    }
    return false;
  }
});
```
