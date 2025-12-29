# Network Core

Real P2P networking using KQTT (WebRTC DataChannels) with BroadcastChannel fallback for same-origin.

```javascript
/**
 * Network - Unified P2P networking layer
 * Uses KQTT for real WebRTC P2P with local BroadcastChannel bridge
 */
class Network {
  constructor() {
    this.kqtt = null;
    this.localBridge = null;
    this.signaling = null;
    this.localId = null;
    this.code = null;
    this.events = {};
    this.isHost = false;
    this.connected = false;
  }

  on(e, fn) { (this.events[e] = this.events[e] || []).push(fn); }
  emit(e, d) { (this.events[e] || []).forEach(fn => fn(d)); }
  off(e, fn) {
    if (this.events[e]) {
      this.events[e] = this.events[e].filter(f => f !== fn);
    }
  }

  /**
   * Initialize the network with a game code
   */
  init(code) {
    this.code = code;

    // Create KQTT instance
    this.kqtt = new GS.KQTT();
    this.localId = this.kqtt.peerId;
    this.signaling = new GS.KQTTSignaling(this.kqtt);

    // Create local bridge for same-origin peers
    this.localBridge = new GS.KQTTLocalBridge(this.kqtt, code);

    // Subscribe to all game messages
    this.kqtt.subscribe(`gs/${code}/#`, (msg) => {
      this._handleMessage(msg);
    });

    // Track peer events
    this.kqtt.on('peer-join', (e) => {
      this.emit('peer-join', e);
      this.connected = this.kqtt.peers.size > 0;
    });

    this.kqtt.on('peer-leave', (e) => {
      this.emit('peer-leave', e);
      this.connected = this.kqtt.peers.size > 0;
    });

    console.log(`[Network] Initialized with code ${code}, peerId: ${this.localId}`);
  }

  _handleMessage(msg) {
    // Ignore messages from self
    if (msg.from === this.localId) return;

    // Parse the message type from the topic
    // Format: gs/{code}/{type}
    const topicParts = msg.topic.split('/');
    const type = topicParts[2];

    // Emit to listeners
    this.emit(type, {
      type,
      from: msg.from,
      ...msg.payload
    });
  }

  /**
   * Send a message to all peers
   */
  send(type, data) {
    if (!this.kqtt || !this.code) return;

    const topic = `gs/${this.code}/${type}`;
    const payload = { ...data, from: this.localId };

    // Publish via KQTT (WebRTC)
    this.kqtt.publish(topic, payload, { qos: 1 });

    // Also publish via local bridge (same-origin)
    if (this.localBridge) {
      this.localBridge.publish(topic, payload, { qos: 0 });
    }
  }

  /**
   * Broadcast is alias for send
   */
  broadcast(type, data) {
    this.send(type, data);
  }

  /**
   * Get connection offer to share with peers
   * Returns a shareable string (base64)
   */
  async getOffer() {
    const result = await this.signaling.createOfferClipboard();
    return result.text;
  }

  /**
   * Accept an offer and return answer
   */
  async acceptOffer(offerText) {
    const result = await this.signaling.acceptOfferFromText(offerText);
    return result.text;
  }

  /**
   * Accept an answer to complete connection
   */
  async acceptAnswer(answerText) {
    return this.signaling.acceptAnswerFromText(answerText);
  }

  /**
   * Get list of connected peer IDs
   */
  getPeers() {
    if (!this.kqtt) return [];
    return Array.from(this.kqtt.peers.keys());
  }

  /**
   * Get network stats
   */
  getStats() {
    if (!this.kqtt) return { peers: 0, sent: 0, received: 0 };
    return this.kqtt.getStats();
  }

  /**
   * Check if we have any peers
   */
  hasConnections() {
    return this.kqtt && this.kqtt.peers.size > 0;
  }

  /**
   * Close all connections
   */
  close() {
    if (this.localBridge) {
      this.localBridge.close();
      this.localBridge = null;
    }
    if (this.kqtt) {
      this.kqtt.close();
      this.kqtt = null;
    }
    this.signaling = null;
    this.connected = false;
  }
}

GS.Network = Network;
```
