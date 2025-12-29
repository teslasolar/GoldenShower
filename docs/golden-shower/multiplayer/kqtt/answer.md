# KQTT Answer

Create answer to join a peer.

```javascript
/**
 * @udt KQTT.answer
 * @extends KQTT
 * Answer creation for joiner
 */
Object.assign(GS.KQTT.prototype, {
  async createAnswer(offer) {
    const conn = new RTCPeerConnection({ iceServers: this.iceServers });
    await conn.setRemoteDescription({ type: 'offer', sdp: offer.sdp });
    const answer = await conn.createAnswer();
    await conn.setLocalDescription(answer);
    await new Promise(r => {
      if (conn.iceGatheringState === 'complete') r();
      else {
        conn.addEventListener('icegatheringstatechange', () => {
          if (conn.iceGatheringState === 'complete') r();
        });
        setTimeout(r, 5000);
      }
    });
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 30000);
      conn.ondatachannel = (event) => {
        const channel = event.channel;
        channel.onopen = () => {
          clearTimeout(timeout);
          this._addPeer(offer.peerId, conn, channel);
          resolve({
            type: 'answer',
            sdp: conn.localDescription.sdp,
            peerId: this.peerId,
            pendingId: offer.pendingId
          });
        };
      };
      conn.onerror = (e) => { clearTimeout(timeout); reject(e); };
    });
  }
});
```
