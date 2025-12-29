# KQTT Publish

Publish messages to topic.

```javascript
/**
 * @udt KQTT.publish
 * @extends KQTT
 * Message publishing with QoS
 */
Object.assign(GS.KQTT.prototype, {
  publish(topic, payload, options = {}) {
    const { qos = 1, retain = false } = options;
    const msg = {
      type: 'PUBLISH',
      topic,
      payload,
      qos,
      retain,
      msgId: this._genMsgId(),
      from: this.peerId,
      ts: Date.now()
    };
    if (retain) this.retained.set(topic, msg);
    const data = JSON.stringify(msg);
    let sent = 0;
    for (const [peerId] of this.peers) {
      if (this._sendToPeer(peerId, data)) sent++;
    }
    this.stats.sent++;
    if (qos >= 1 && sent > 0) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.pendingAcks.delete(msg.msgId);
          reject(new Error('ACK timeout'));
        }, 5000);
        this.pendingAcks.set(msg.msgId, { resolve, timeout, retries: 0 });
      });
    }
    return Promise.resolve();
  }
});
```
