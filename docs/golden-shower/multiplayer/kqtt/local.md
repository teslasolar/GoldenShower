# KQTT Local Bridge

Same-origin fast path via BroadcastChannel.

```javascript
/**
 * @udt KQTTLocalBridge
 * BroadcastChannel for same-origin peers
 */
class KQTTLocalBridge {
  constructor(kqtt, channelName) {
    this.kqtt = kqtt;
    this.channel = new BroadcastChannel('kqtt-' + channelName);
    this.localPeers = new Set();
    this.channel.onmessage = (e) => this._handleMessage(e.data);
    this.channel.postMessage({ type: 'announce', peerId: kqtt.peerId });
  }

  _handleMessage(msg) {
    if (msg.peerId === this.kqtt.peerId) return;
    if (msg.type === 'announce') {
      this.localPeers.add(msg.peerId);
      this.channel.postMessage({ type: 'announce-ack', peerId: this.kqtt.peerId, to: msg.peerId });
    } else if (msg.type === 'announce-ack' && msg.to === this.kqtt.peerId) {
      this.localPeers.add(msg.peerId);
    } else if (msg.type === 'publish' && this.localPeers.has(msg.from)) {
      for (const [pattern, callbacks] of this.kqtt.subscriptions) {
        if (this.kqtt._topicMatch(pattern, msg.topic)) {
          for (const cb of callbacks) {
            try { cb({ topic: msg.topic, payload: msg.payload, qos: msg.qos || 0, retain: msg.retain || false, from: msg.from, timestamp: msg.ts }); } catch {}
          }
        }
      }
    }
  }

  publish(topic, payload, options = {}) {
    this.channel.postMessage({ type: 'publish', topic, payload, qos: options.qos || 0, retain: options.retain || false, from: this.kqtt.peerId, ts: Date.now() });
  }

  close() { this.channel.close(); this.localPeers.clear(); }
}

GS.KQTTLocalBridge = KQTTLocalBridge;
```
