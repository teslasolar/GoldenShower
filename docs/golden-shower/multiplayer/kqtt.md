# KQTT - Konomi P2P MQTT

Real P2P mesh networking over WebRTC DataChannels. Implements MQTT-style pub/sub semantics without a central broker.

## Core Protocol

```javascript
/**
 * KQTT - Konomi P2P MQTT over WebRTC
 * Serverless pub/sub mesh network with MQTT semantics
 */
class KQTT {
  constructor() {
    this.peerId = this._genId();
    this.peers = new Map();           // peerId -> { conn, channel, state }
    this.subscriptions = new Map();   // topic pattern -> Set of callbacks
    this.retained = new Map();        // topic -> last message
    this.pendingAcks = new Map();     // msgId -> { resolve, timeout, retries }
    this.seenMessages = new Set();    // Dedup message IDs
    this.events = {};
    this.stats = { sent: 0, received: 0, peers: 0 };

    // ICE servers for NAT traversal
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ];

    // Message ID counter
    this._msgSeq = 0;

    // Cleanup seen messages periodically (memory management)
    setInterval(() => {
      if (this.seenMessages.size > 10000) {
        this.seenMessages.clear();
      }
    }, 60000);
  }

  _genId() { return Math.random().toString(36).substr(2, 8); }
  _genMsgId() { return `${this.peerId}-${++this._msgSeq}-${Date.now()}`; }

  on(e, fn) { (this.events[e] = this.events[e] || []).push(fn); }
  emit(e, d) { (this.events[e] || []).forEach(fn => fn(d)); }
  off(e, fn) {
    if (this.events[e]) {
      this.events[e] = this.events[e].filter(f => f !== fn);
    }
  }

  /**
   * Create an offer to connect to this peer (for host)
   * Returns SDP offer to share with remote peer
   */
  async createOffer() {
    const conn = new RTCPeerConnection({ iceServers: this.iceServers });
    const channel = conn.createDataChannel('kqtt', {
      ordered: false,      // Lower latency for games
      maxRetransmits: 3    // Some reliability
    });

    const offer = await conn.createOffer();
    await conn.setLocalDescription(offer);

    // Wait for ICE gathering to complete
    await new Promise(resolve => {
      if (conn.iceGatheringState === 'complete') {
        resolve();
      } else {
        conn.addEventListener('icegatheringstatechange', () => {
          if (conn.iceGatheringState === 'complete') resolve();
        });
        // Timeout after 5 seconds
        setTimeout(resolve, 5000);
      }
    });

    const pendingId = this._genId();
    this._pendingConnections = this._pendingConnections || new Map();
    this._pendingConnections.set(pendingId, { conn, channel });

    return {
      type: 'offer',
      sdp: conn.localDescription.sdp,
      peerId: this.peerId,
      pendingId
    };
  }

  /**
   * Accept an answer from remote peer (for host)
   */
  async acceptAnswer(answer) {
    const pending = this._pendingConnections?.get(answer.pendingId);
    if (!pending) throw new Error('No pending connection for this answer');

    const { conn, channel } = pending;
    this._pendingConnections.delete(answer.pendingId);

    await conn.setRemoteDescription({
      type: 'answer',
      sdp: answer.sdp
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 30000);

      channel.onopen = () => {
        clearTimeout(timeout);
        this._addPeer(answer.peerId, conn, channel);
        resolve(answer.peerId);
      };

      channel.onerror = (e) => {
        clearTimeout(timeout);
        reject(e);
      };
    });
  }

  /**
   * Create an answer to join a peer (for joiner)
   * Takes offer SDP and returns answer SDP
   */
  async createAnswer(offer) {
    const conn = new RTCPeerConnection({ iceServers: this.iceServers });

    await conn.setRemoteDescription({
      type: 'offer',
      sdp: offer.sdp
    });

    const answer = await conn.createAnswer();
    await conn.setLocalDescription(answer);

    // Wait for ICE gathering
    await new Promise(resolve => {
      if (conn.iceGatheringState === 'complete') {
        resolve();
      } else {
        conn.addEventListener('icegatheringstatechange', () => {
          if (conn.iceGatheringState === 'complete') resolve();
        });
        setTimeout(resolve, 5000);
      }
    });

    // Handle incoming data channel
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Channel timeout')), 30000);

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

      conn.onerror = (e) => {
        clearTimeout(timeout);
        reject(e);
      };
    });
  }

  /**
   * Add a connected peer to the mesh
   */
  _addPeer(peerId, conn, channel) {
    const peer = {
      conn,
      channel,
      state: 'connected',
      connectedAt: Date.now(),
      lastSeen: Date.now()
    };

    channel.onmessage = (e) => this._handleMessage(peerId, e.data);
    channel.onclose = () => this._removePeer(peerId);
    channel.onerror = () => this._removePeer(peerId);

    conn.oniceconnectionstatechange = () => {
      if (conn.iceConnectionState === 'disconnected' ||
          conn.iceConnectionState === 'failed') {
        this._removePeer(peerId);
      }
    };

    this.peers.set(peerId, peer);
    this.stats.peers = this.peers.size;
    this.emit('peer-join', { peerId });

    // Send retained messages to new peer
    for (const [topic, msg] of this.retained) {
      this._sendToPeer(peerId, JSON.stringify({
        type: 'PUBLISH',
        ...msg,
        retain: true
      }));
    }

    // Announce ourselves to mesh via new peer
    this._sendToPeer(peerId, JSON.stringify({
      type: 'ANNOUNCE',
      peerId: this.peerId,
      timestamp: Date.now()
    }));
  }

  _removePeer(peerId) {
    const peer = this.peers.get(peerId);
    if (peer) {
      try { peer.channel.close(); } catch {}
      try { peer.conn.close(); } catch {}
      this.peers.delete(peerId);
      this.stats.peers = this.peers.size;
      this.emit('peer-leave', { peerId });
    }
  }

  _sendToPeer(peerId, data) {
    const peer = this.peers.get(peerId);
    if (peer && peer.channel.readyState === 'open') {
      try {
        peer.channel.send(data);
        return true;
      } catch (e) {
        console.warn('[KQTT] Send error:', e);
        return false;
      }
    }
    return false;
  }

  /**
   * Handle incoming message from a peer
   */
  _handleMessage(fromPeer, data) {
    try {
      const msg = JSON.parse(data);

      // Update peer last seen
      const peer = this.peers.get(fromPeer);
      if (peer) peer.lastSeen = Date.now();

      // Deduplicate
      if (msg.msgId && this.seenMessages.has(msg.msgId)) {
        return;
      }
      if (msg.msgId) {
        this.seenMessages.add(msg.msgId);
      }

      switch (msg.type) {
        case 'PUBLISH':
          this._handlePublish(fromPeer, msg);
          break;
        case 'PUBACK':
          this._handlePuback(msg);
          break;
        case 'ANNOUNCE':
          this.emit('peer-announce', { peerId: msg.peerId, from: fromPeer });
          break;
        case 'PING':
          this._sendToPeer(fromPeer, JSON.stringify({ type: 'PONG', ts: msg.ts }));
          break;
        case 'PONG':
          this.emit('pong', { peerId: fromPeer, latency: Date.now() - msg.ts });
          break;
      }
    } catch (e) {
      console.warn('[KQTT] Parse error:', e);
    }
  }

  _handlePublish(fromPeer, msg) {
    this.stats.received++;

    // Store retained message
    if (msg.retain) {
      this.retained.set(msg.topic, msg);
    }

    // Check subscriptions
    for (const [pattern, callbacks] of this.subscriptions) {
      if (this._topicMatch(pattern, msg.topic)) {
        for (const cb of callbacks) {
          try {
            cb({
              topic: msg.topic,
              payload: msg.payload,
              qos: msg.qos,
              retain: msg.retain,
              from: msg.from,
              timestamp: msg.ts
            });
          } catch (e) {
            console.error('[KQTT] Callback error:', e);
          }
        }
      }
    }

    // Send ACK for QoS 1+
    if (msg.qos >= 1) {
      this._sendToPeer(fromPeer, JSON.stringify({
        type: 'PUBACK',
        msgId: msg.msgId
      }));
    }

    // Forward to other peers (mesh propagation)
    this._forward(fromPeer, msg);

    this.emit('message', { topic: msg.topic, payload: msg.payload, from: msg.from });
  }

  _handlePuback(msg) {
    const pending = this.pendingAcks.get(msg.msgId);
    if (pending) {
      clearTimeout(pending.timeout);
      pending.resolve();
      this.pendingAcks.delete(msg.msgId);
    }
  }

  /**
   * Forward message to all peers except sender
   */
  _forward(fromPeer, msg) {
    const data = JSON.stringify(msg);
    for (const [peerId] of this.peers) {
      if (peerId !== fromPeer) {
        this._sendToPeer(peerId, data);
      }
    }
  }

  /**
   * MQTT-style topic matching with + and # wildcards
   */
  _topicMatch(pattern, topic) {
    if (pattern === '#') return true;

    const patternParts = pattern.split('/');
    const topicParts = topic.split('/');

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '#') return true;
      if (patternParts[i] === '+') continue;
      if (i >= topicParts.length) return false;
      if (patternParts[i] !== topicParts[i]) return false;
    }

    return patternParts.length === topicParts.length;
  }

  /**
   * Subscribe to a topic pattern
   */
  subscribe(pattern, callback) {
    if (!this.subscriptions.has(pattern)) {
      this.subscriptions.set(pattern, new Set());
    }
    this.subscriptions.get(pattern).add(callback);

    // Deliver retained messages
    for (const [topic, msg] of this.retained) {
      if (this._topicMatch(pattern, topic)) {
        callback({
          topic,
          payload: msg.payload,
          qos: msg.qos,
          retain: true,
          from: msg.from,
          timestamp: msg.ts
        });
      }
    }

    return () => this.unsubscribe(pattern, callback);
  }

  unsubscribe(pattern, callback) {
    const subs = this.subscriptions.get(pattern);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) {
        this.subscriptions.delete(pattern);
      }
    }
  }

  /**
   * Publish a message to a topic
   */
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

    // Store if retained
    if (retain) {
      this.retained.set(topic, msg);
    }

    // Broadcast to all peers
    const data = JSON.stringify(msg);
    let sent = 0;
    for (const [peerId] of this.peers) {
      if (this._sendToPeer(peerId, data)) sent++;
    }

    this.stats.sent++;

    // Handle QoS
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

  /**
   * Get connection stats
   */
  getStats() {
    return {
      ...this.stats,
      peerId: this.peerId,
      subscriptions: this.subscriptions.size,
      retained: this.retained.size
    };
  }

  /**
   * Close all connections
   */
  close() {
    for (const [peerId] of this.peers) {
      this._removePeer(peerId);
    }
    this.subscriptions.clear();
    this.retained.clear();
    this.pendingAcks.clear();
  }
}

GS.KQTT = KQTT;
```

## Signaling Helper

Helper for exchanging WebRTC offers/answers. Supports multiple signaling methods.

```javascript
/**
 * KQTT Signaling - Exchange offers/answers between peers
 * Supports: Clipboard, QR Code, WebSocket relay
 */
class KQTTSignaling {
  constructor(kqtt) {
    this.kqtt = kqtt;
    this.relayUrl = null;
    this.relayWs = null;
  }

  /**
   * Create offer and copy to clipboard
   */
  async createOfferClipboard() {
    const offer = await this.kqtt.createOffer();
    const offerStr = btoa(JSON.stringify(offer));

    try {
      await navigator.clipboard.writeText(offerStr);
      return { offer, copied: true, text: offerStr };
    } catch {
      return { offer, copied: false, text: offerStr };
    }
  }

  /**
   * Accept an offer from clipboard/input
   */
  async acceptOfferFromText(offerText) {
    const offer = JSON.parse(atob(offerText.trim()));
    const answer = await this.kqtt.createAnswer(offer);
    const answerStr = btoa(JSON.stringify(answer));

    try {
      await navigator.clipboard.writeText(answerStr);
      return { answer, copied: true, text: answerStr };
    } catch {
      return { answer, copied: false, text: answerStr };
    }
  }

  /**
   * Accept an answer from clipboard/input
   */
  async acceptAnswerFromText(answerText) {
    const answer = JSON.parse(atob(answerText.trim()));
    return this.kqtt.acceptAnswer(answer);
  }

  /**
   * Connect to a WebSocket signaling relay
   */
  connectRelay(url, roomCode) {
    return new Promise((resolve, reject) => {
      this.relayWs = new WebSocket(url);
      this.roomCode = roomCode;

      this.relayWs.onopen = () => {
        this.relayWs.send(JSON.stringify({
          type: 'join',
          room: roomCode,
          peerId: this.kqtt.peerId
        }));
        resolve();
      };

      this.relayWs.onmessage = async (e) => {
        try {
          const msg = JSON.parse(e.data);
          await this._handleRelayMessage(msg);
        } catch (err) {
          console.warn('[KQTT Signaling] Relay error:', err);
        }
      };

      this.relayWs.onerror = reject;
      this.relayWs.onclose = () => {
        this.relayWs = null;
      };
    });
  }

  async _handleRelayMessage(msg) {
    switch (msg.type) {
      case 'offer':
        // Someone is offering to connect
        const answer = await this.kqtt.createAnswer(msg);
        this.relayWs.send(JSON.stringify({
          type: 'answer',
          ...answer,
          target: msg.peerId
        }));
        break;

      case 'answer':
        // Response to our offer
        await this.kqtt.acceptAnswer(msg);
        break;

      case 'peer-joined':
        // New peer in room, initiate connection
        const offer = await this.kqtt.createOffer();
        this.relayWs.send(JSON.stringify({
          type: 'offer',
          ...offer,
          target: msg.peerId
        }));
        break;
    }
  }

  /**
   * Disconnect from relay
   */
  disconnectRelay() {
    if (this.relayWs) {
      this.relayWs.close();
      this.relayWs = null;
    }
  }
}

GS.KQTTSignaling = KQTTSignaling;
```

## BroadcastChannel Bridge

Bridge for local same-origin peers (fast path for same browser).

```javascript
/**
 * KQTT BroadcastChannel Bridge
 * Local same-origin fast path alongside WebRTC
 */
class KQTTLocalBridge {
  constructor(kqtt, channelName) {
    this.kqtt = kqtt;
    this.channel = new BroadcastChannel('kqtt-' + channelName);
    this.localPeers = new Set();

    this.channel.onmessage = (e) => this._handleMessage(e.data);

    // Announce on local channel
    this.channel.postMessage({
      type: 'announce',
      peerId: kqtt.peerId
    });
  }

  _handleMessage(msg) {
    if (msg.peerId === this.kqtt.peerId) return;

    switch (msg.type) {
      case 'announce':
        this.localPeers.add(msg.peerId);
        // Respond to announce
        this.channel.postMessage({
          type: 'announce-ack',
          peerId: this.kqtt.peerId,
          to: msg.peerId
        });
        break;

      case 'announce-ack':
        if (msg.to === this.kqtt.peerId) {
          this.localPeers.add(msg.peerId);
        }
        break;

      case 'publish':
        // Forward to KQTT as if from a peer
        if (!this.localPeers.has(msg.from)) return;

        // Check subscriptions directly
        for (const [pattern, callbacks] of this.kqtt.subscriptions) {
          if (this.kqtt._topicMatch(pattern, msg.topic)) {
            for (const cb of callbacks) {
              try {
                cb({
                  topic: msg.topic,
                  payload: msg.payload,
                  qos: msg.qos || 0,
                  retain: msg.retain || false,
                  from: msg.from,
                  timestamp: msg.ts
                });
              } catch {}
            }
          }
        }
        break;
    }
  }

  /**
   * Publish via local channel (in addition to WebRTC)
   */
  publish(topic, payload, options = {}) {
    this.channel.postMessage({
      type: 'publish',
      topic,
      payload,
      qos: options.qos || 0,
      retain: options.retain || false,
      from: this.kqtt.peerId,
      ts: Date.now()
    });
  }

  close() {
    this.channel.close();
    this.localPeers.clear();
  }
}

GS.KQTTLocalBridge = KQTTLocalBridge;
```
