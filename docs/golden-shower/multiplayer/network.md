# Multiplayer Network Layer

WebRTC-based peer-to-peer networking for connecting GitHub Pages VM clients.

## Architecture

```
┌─────────────────┐     WebRTC      ┌─────────────────┐
│  GitHub Pages   │◄───────────────►│  GitHub Pages   │
│    Client A     │   DataChannel   │    Client B     │
└─────────────────┘                 └─────────────────┘
         │                                   │
         │         ┌─────────────┐           │
         └────────►│  Signaling  │◄──────────┘
                   │   Server    │
                   └─────────────┘
```

## Core Network Module

```javascript
/**
 * Golden Shower Network Layer
 * Handles WebRTC peer connections and state sync
 */
GoldenShower.Network = (function() {
  const peers = new Map();
  const localState = {};
  let localPlayerId = null;
  let isHost = false;

  // ICE servers for NAT traversal
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ];

  // Event emitter
  const events = {};
  function emit(event, data) {
    (events[event] || []).forEach(fn => fn(data));
  }
  function on(event, fn) {
    events[event] = events[event] || [];
    events[event].push(fn);
  }

  /**
   * Create a peer connection
   */
  function createPeer(peerId) {
    const pc = new RTCPeerConnection({ iceServers });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal(peerId, {
          type: 'ice-candidate',
          candidate: e.candidate
        });
      }
    };

    pc.ondatachannel = (e) => {
      setupDataChannel(peerId, e.channel);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        emit('peer-connected', { peerId });
      } else if (pc.connectionState === 'disconnected') {
        emit('peer-disconnected', { peerId });
        peers.delete(peerId);
      }
    };

    peers.set(peerId, { pc, channel: null, state: {} });
    return pc;
  }

  /**
   * Setup data channel for game messages
   */
  function setupDataChannel(peerId, channel) {
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      console.log(`[Network] Channel open to ${peerId}`);
      peers.get(peerId).channel = channel;
      emit('channel-open', { peerId });
    };

    channel.onmessage = (e) => {
      const msg = typeof e.data === 'string'
        ? JSON.parse(e.data)
        : decodeMessage(e.data);
      handleMessage(peerId, msg);
    };

    channel.onclose = () => {
      emit('channel-close', { peerId });
    };
  }

  /**
   * Handle incoming messages
   */
  function handleMessage(peerId, msg) {
    switch (msg.type) {
      case 'state-update':
        peers.get(peerId).state = msg.state;
        emit('state-update', { peerId, state: msg.state });
        break;

      case 'player-input':
        emit('player-input', { peerId, input: msg.input });
        break;

      case 'game-event':
        emit('game-event', { peerId, event: msg.event });
        break;

      case 'ping':
        send(peerId, { type: 'pong', timestamp: msg.timestamp });
        break;

      case 'pong':
        const latency = Date.now() - msg.timestamp;
        peers.get(peerId).latency = latency;
        break;
    }
  }

  /**
   * Connect to a peer (initiator)
   */
  async function connectTo(peerId) {
    const pc = createPeer(peerId);
    const channel = pc.createDataChannel('game', {
      ordered: false,
      maxRetransmits: 0
    });
    setupDataChannel(peerId, channel);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    sendSignal(peerId, {
      type: 'offer',
      sdp: pc.localDescription
    });
  }

  /**
   * Handle signaling messages
   */
  async function handleSignal(fromId, signal) {
    let peer = peers.get(fromId);

    if (signal.type === 'offer') {
      const pc = peer ? peer.pc : createPeer(fromId);
      await pc.setRemoteDescription(signal.sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendSignal(fromId, {
        type: 'answer',
        sdp: pc.localDescription
      });
    }
    else if (signal.type === 'answer') {
      if (peer) {
        await peer.pc.setRemoteDescription(signal.sdp);
      }
    }
    else if (signal.type === 'ice-candidate') {
      if (peer) {
        await peer.pc.addIceCandidate(signal.candidate);
      }
    }
  }

  /**
   * Send message to a peer
   */
  function send(peerId, msg) {
    const peer = peers.get(peerId);
    if (peer && peer.channel && peer.channel.readyState === 'open') {
      peer.channel.send(JSON.stringify(msg));
    }
  }

  /**
   * Broadcast to all peers
   */
  function broadcast(msg) {
    for (const [peerId] of peers) {
      send(peerId, msg);
    }
  }

  /**
   * Send local player state
   */
  function sendState(state) {
    localState.state = state;
    broadcast({
      type: 'state-update',
      state
    });
  }

  /**
   * Send player input
   */
  function sendInput(input) {
    broadcast({
      type: 'player-input',
      input
    });
  }

  /**
   * Send game event
   */
  function sendEvent(event) {
    broadcast({
      type: 'game-event',
      event
    });
  }

  // Signaling abstraction (to be implemented based on method)
  let signalMethod = null;

  function setSignalMethod(method) {
    signalMethod = method;
  }

  function sendSignal(peerId, signal) {
    if (signalMethod) {
      signalMethod.send(peerId, signal);
    }
  }

  return {
    on,
    emit,
    createPeer,
    connectTo,
    handleSignal,
    send,
    broadcast,
    sendState,
    sendInput,
    sendEvent,
    setSignalMethod,
    get peers() { return peers; },
    get localPlayerId() { return localPlayerId; },
    set localPlayerId(id) { localPlayerId = id; },
    get isHost() { return isHost; },
    set isHost(v) { isHost = v; }
  };
})();
```

## Signaling Methods

### Method 1: BroadcastChannel (Same Origin)

For testing or same-origin connections:

```javascript
/**
 * BroadcastChannel signaling (same origin only)
 */
GoldenShower.Signaling = GoldenShower.Signaling || {};

GoldenShower.Signaling.BroadcastChannel = (function() {
  let channel = null;
  let playerId = null;

  function init(lobbyCode) {
    playerId = crypto.randomUUID();
    channel = new BroadcastChannel(`golden-shower-${lobbyCode}`);

    channel.onmessage = (e) => {
      const { from, to, signal } = e.data;
      if (to === playerId || to === 'all') {
        GoldenShower.Network.handleSignal(from, signal);
      }
    };

    // Announce presence
    channel.postMessage({
      from: playerId,
      to: 'all',
      signal: { type: 'announce' }
    });

    return playerId;
  }

  function send(peerId, signal) {
    channel.postMessage({
      from: playerId,
      to: peerId,
      signal
    });
  }

  function close() {
    if (channel) channel.close();
  }

  return { init, send, close };
})();
```

### Method 2: WebSocket Signaling Server

For cross-origin connections:

```javascript
/**
 * WebSocket signaling (cross-origin)
 */
GoldenShower.Signaling.WebSocket = (function() {
  let ws = null;
  let playerId = null;

  function init(serverUrl, lobbyCode) {
    playerId = crypto.randomUUID();
    ws = new WebSocket(serverUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'join',
        lobby: lobbyCode,
        playerId
      }));
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'signal') {
        GoldenShower.Network.handleSignal(msg.from, msg.signal);
      } else if (msg.type === 'peer-list') {
        msg.peers.forEach(peerId => {
          if (peerId !== playerId) {
            GoldenShower.Network.connectTo(peerId);
          }
        });
      }
    };

    return playerId;
  }

  function send(peerId, signal) {
    ws.send(JSON.stringify({
      type: 'signal',
      to: peerId,
      from: playerId,
      signal
    }));
  }

  function close() {
    if (ws) ws.close();
  }

  return { init, send, close };
})();
```

### Method 3: Shared Clipboard/URL (Manual)

For serverless connection:

```javascript
/**
 * Manual signaling via copy/paste or URL
 */
GoldenShower.Signaling.Manual = (function() {
  let playerId = null;
  let pendingSignals = [];

  function init() {
    playerId = crypto.randomUUID();
    return playerId;
  }

  function getOffer() {
    return btoa(JSON.stringify(pendingSignals));
  }

  function setAnswer(encodedAnswer) {
    const signals = JSON.parse(atob(encodedAnswer));
    signals.forEach(s => {
      GoldenShower.Network.handleSignal(s.from, s.signal);
    });
  }

  function send(peerId, signal) {
    pendingSignals.push({ to: peerId, signal });
  }

  return { init, getOffer, setAnswer, send };
})();
```

## Message Encoding (Binary)

For efficient state sync:

```javascript
/**
 * Binary message encoding for performance
 */
GoldenShower.MessageCodec = (function() {
  const MSG_STATE = 1;
  const MSG_INPUT = 2;
  const MSG_EVENT = 3;

  function encodeState(state) {
    const buffer = new ArrayBuffer(32);
    const view = new DataView(buffer);

    view.setUint8(0, MSG_STATE);
    view.setUint8(1, state.playerId);
    view.setFloat32(2, state.x, true);
    view.setFloat32(6, state.y, true);
    view.setFloat32(10, state.z, true);
    view.setFloat32(14, state.yaw, true);
    view.setFloat32(18, state.pitch, true);
    view.setUint8(22, state.health);
    view.setUint8(23, state.weapon);
    view.setUint8(24, state.ammo);
    view.setUint8(25, state.flags);

    return buffer;
  }

  function decodeState(buffer) {
    const view = new DataView(buffer);
    return {
      type: 'state-update',
      state: {
        playerId: view.getUint8(1),
        x: view.getFloat32(2, true),
        y: view.getFloat32(6, true),
        z: view.getFloat32(10, true),
        yaw: view.getFloat32(14, true),
        pitch: view.getFloat32(18, true),
        health: view.getUint8(22),
        weapon: view.getUint8(23),
        ammo: view.getUint8(24),
        flags: view.getUint8(25)
      }
    };
  }

  function encodeInput(input) {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);

    view.setUint8(0, MSG_INPUT);
    view.setUint8(1, input.playerId);
    view.setUint16(2, input.buttons, true);
    view.setInt8(4, input.moveX);
    view.setInt8(5, input.moveY);
    view.setInt8(6, input.lookX);
    view.setInt8(7, input.lookY);

    return buffer;
  }

  function decodeMessage(buffer) {
    const view = new DataView(buffer);
    const type = view.getUint8(0);

    switch (type) {
      case MSG_STATE: return decodeState(buffer);
      case MSG_INPUT: return decodeInput(buffer);
      default: return null;
    }
  }

  return { encodeState, encodeInput, decodeMessage };
})();
```

## State Synchronization

```javascript
/**
 * Game state synchronization
 */
GoldenShower.StateSync = (function() {
  const SYNC_RATE = 1000 / 20; // 20 Hz
  let lastSync = 0;
  let interpolationBuffer = new Map();

  /**
   * Update local state and broadcast
   */
  function update(localPlayer) {
    const now = performance.now();
    if (now - lastSync >= SYNC_RATE) {
      GoldenShower.Network.sendState({
        playerId: localPlayer.id,
        x: localPlayer.pos.x,
        y: localPlayer.pos.y,
        z: localPlayer.pos.z,
        yaw: localPlayer.yaw,
        pitch: localPlayer.pitch,
        health: localPlayer.health,
        weapon: localPlayer.weapon,
        ammo: localPlayer.ammo,
        flags: localPlayer.flags
      });
      lastSync = now;
    }
  }

  /**
   * Receive remote state and buffer for interpolation
   */
  function receive(state) {
    const buffer = interpolationBuffer.get(state.playerId) || [];
    buffer.push({
      timestamp: performance.now(),
      state
    });

    // Keep last 1 second of states
    while (buffer.length > 20) buffer.shift();
    interpolationBuffer.set(state.playerId, buffer);
  }

  /**
   * Interpolate remote player position
   */
  function interpolate(playerId, renderTime) {
    const buffer = interpolationBuffer.get(playerId);
    if (!buffer || buffer.length < 2) return null;

    // Find surrounding states
    const targetTime = renderTime - 100; // 100ms interpolation delay
    let before = null, after = null;

    for (let i = 0; i < buffer.length - 1; i++) {
      if (buffer[i].timestamp <= targetTime &&
          buffer[i + 1].timestamp >= targetTime) {
        before = buffer[i];
        after = buffer[i + 1];
        break;
      }
    }

    if (!before || !after) {
      return buffer[buffer.length - 1].state;
    }

    // Linear interpolation
    const t = (targetTime - before.timestamp) /
              (after.timestamp - before.timestamp);

    return {
      ...after.state,
      x: before.state.x + (after.state.x - before.state.x) * t,
      y: before.state.y + (after.state.y - before.state.y) * t,
      z: before.state.z + (after.state.z - before.state.z) * t,
      yaw: lerpAngle(before.state.yaw, after.state.yaw, t),
      pitch: before.state.pitch + (after.state.pitch - before.state.pitch) * t
    };
  }

  function lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  // Hook into network events
  GoldenShower.Network.on('state-update', ({ state }) => {
    receive(state);
  });

  return { update, interpolate };
})();
```

## Usage Example

```javascript
// Initialize networking
async function initMultiplayer(lobbyCode) {
  // Choose signaling method
  const signaling = GoldenShower.Signaling.BroadcastChannel;
  GoldenShower.Network.setSignalMethod(signaling);

  // Join lobby
  const playerId = signaling.init(lobbyCode);
  GoldenShower.Network.localPlayerId = playerId;

  // Listen for events
  GoldenShower.Network.on('peer-connected', ({ peerId }) => {
    console.log(`Player ${peerId} connected`);
  });

  GoldenShower.Network.on('state-update', ({ peerId, state }) => {
    // Update remote player position
    const player = game.getPlayer(peerId);
    if (player) {
      player.setRemoteState(state);
    }
  });

  return playerId;
}
```
