# KQTT Connect

WebRTC offer/answer connection methods.

```javascript
/**
 * @udt KQTT.connect
 * @extends KQTT
 * Connection establishment methods
 */
Object.assign(GS.KQTT.prototype, {
  async createOffer() {
    const conn = new RTCPeerConnection({ iceServers: this.iceServers });
    const channel = conn.createDataChannel('kqtt', { ordered: false, maxRetransmits: 3 });
    const offer = await conn.createOffer();
    await conn.setLocalDescription(offer);
    await new Promise(r => {
      if (conn.iceGatheringState === 'complete') r();
      else {
        conn.addEventListener('icegatheringstatechange', () => {
          if (conn.iceGatheringState === 'complete') r();
        });
        setTimeout(r, 5000);
      }
    });
    const pendingId = this._genId();
    this._pendingConnections.set(pendingId, { conn, channel });
    return { type: 'offer', sdp: conn.localDescription.sdp, peerId: this.peerId, pendingId };
  },

  async acceptAnswer(answer) {
    const pending = this._pendingConnections.get(answer.pendingId);
    if (!pending) throw new Error('No pending connection');
    const { conn, channel } = pending;
    this._pendingConnections.delete(answer.pendingId);
    await conn.setRemoteDescription({ type: 'answer', sdp: answer.sdp });
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 30000);
      channel.onopen = () => { clearTimeout(timeout); this._addPeer(answer.peerId, conn, channel); resolve(answer.peerId); };
      channel.onerror = (e) => { clearTimeout(timeout); reject(e); };
    });
  }
});
```
