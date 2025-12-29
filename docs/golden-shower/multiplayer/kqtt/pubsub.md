# KQTT PubSub

Subscribe and publish with MQTT topic matching.

```javascript
/**
 * @udt KQTT.pubsub
 * @extends KQTT
 * Pub/sub with topic matching
 */
Object.assign(GS.KQTT.prototype, {
  _topicMatch(pattern, topic) {
    if (pattern === '#') return true;
    const pp = pattern.split('/'), tp = topic.split('/');
    for (let i = 0; i < pp.length; i++) {
      if (pp[i] === '#') return true;
      if (pp[i] === '+') continue;
      if (i >= tp.length || pp[i] !== tp[i]) return false;
    }
    return pp.length === tp.length;
  },

  subscribe(pattern, callback) {
    if (!this.subscriptions.has(pattern)) this.subscriptions.set(pattern, new Set());
    this.subscriptions.get(pattern).add(callback);
    for (const [topic, msg] of this.retained) {
      if (this._topicMatch(pattern, topic)) {
        callback({ topic, payload: msg.payload, qos: msg.qos, retain: true, from: msg.from, timestamp: msg.ts });
      }
    }
    return () => this.unsubscribe(pattern, callback);
  },

  unsubscribe(pattern, callback) {
    const subs = this.subscriptions.get(pattern);
    if (subs) { subs.delete(callback); if (subs.size === 0) this.subscriptions.delete(pattern); }
  },

  _handlePublish(fromPeer, msg) {
    this.stats.received++;
    if (msg.retain) this.retained.set(msg.topic, msg);
    for (const [pattern, callbacks] of this.subscriptions) {
      if (this._topicMatch(pattern, msg.topic)) {
        for (const cb of callbacks) {
          try { cb({ topic: msg.topic, payload: msg.payload, qos: msg.qos, retain: msg.retain, from: msg.from, timestamp: msg.ts }); } catch {}
        }
      }
    }
    if (msg.qos >= 1) this._sendToPeer(fromPeer, JSON.stringify({ type: 'PUBACK', msgId: msg.msgId }));
    this._forward(fromPeer, msg);
    this.emit('message', { topic: msg.topic, payload: msg.payload, from: msg.from });
  }
});
```
