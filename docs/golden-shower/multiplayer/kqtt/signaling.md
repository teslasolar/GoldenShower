# KQTT Signaling

Exchange offers/answers via clipboard or relay.

```javascript
/**
 * @udt KQTTSignaling
 * Clipboard and WebSocket signaling
 */
class KQTTSignaling {
  constructor(kqtt) {
    this.kqtt = kqtt;
    this.relayWs = null;
    this.roomCode = null;
  }

  async createOfferClipboard() {
    const offer = await this.kqtt.createOffer();
    const text = btoa(JSON.stringify(offer));
    try { await navigator.clipboard.writeText(text); return { offer, copied: true, text }; }
    catch { return { offer, copied: false, text }; }
  }

  async acceptOfferFromText(offerText) {
    const offer = JSON.parse(atob(offerText.trim()));
    const answer = await this.kqtt.createAnswer(offer);
    const text = btoa(JSON.stringify(answer));
    try { await navigator.clipboard.writeText(text); return { answer, copied: true, text }; }
    catch { return { answer, copied: false, text }; }
  }

  async acceptAnswerFromText(answerText) {
    const answer = JSON.parse(atob(answerText.trim()));
    return this.kqtt.acceptAnswer(answer);
  }

  connectRelay(url, roomCode) {
    return new Promise((resolve, reject) => {
      this.relayWs = new WebSocket(url);
      this.roomCode = roomCode;
      this.relayWs.onopen = () => {
        this.relayWs.send(JSON.stringify({ type: 'join', room: roomCode, peerId: this.kqtt.peerId }));
        resolve();
      };
      this.relayWs.onmessage = async (e) => this._handleRelayMessage(JSON.parse(e.data));
      this.relayWs.onerror = reject;
    });
  }

  async _handleRelayMessage(msg) {
    if (msg.type === 'offer') {
      const answer = await this.kqtt.createAnswer(msg);
      this.relayWs.send(JSON.stringify({ type: 'answer', ...answer, target: msg.peerId }));
    } else if (msg.type === 'answer') {
      await this.kqtt.acceptAnswer(msg);
    } else if (msg.type === 'peer-joined') {
      const offer = await this.kqtt.createOffer();
      this.relayWs.send(JSON.stringify({ type: 'offer', ...offer, target: msg.peerId }));
    }
  }

  disconnectRelay() { if (this.relayWs) { this.relayWs.close(); this.relayWs = null; } }
}

GS.KQTTSignaling = KQTTSignaling;
```
