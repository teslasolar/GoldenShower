# State Synchronization

Real P2P state sync at 20Hz with interpolation buffer and latency compensation.

```javascript
/**
 * StateSync - P2P state synchronization with interpolation
 * Handles network latency, jitter, and packet loss
 */
class StateSync {
  constructor() {
    this.rate = 1000 / 20;           // 50ms = 20Hz send rate
    this.last = 0;
    this.buffer = new Map();          // Per-player state history
    this.interpolationDelay = 100;    // 100ms interpolation buffer
    this.latencyEstimates = new Map(); // Per-peer RTT estimates
    this.sequenceNumbers = new Map();  // Per-peer sequence for ordering
    this.localSequence = 0;
    this.stats = {
      sent: 0,
      received: 0,
      dropped: 0,
      outOfOrder: 0
    };
  }

  /**
   * Update and send local player state
   */
  update(player, net) {
    const now = performance.now();
    if (now - this.last >= this.rate) {
      const state = player.getState();
      state.seq = ++this.localSequence;
      state.ts = now;
      state.serverTime = Date.now(); // Wall clock for cross-client sync

      net.send('state', state);
      this.stats.sent++;
      this.last = now;
    }
  }

  /**
   * Receive and buffer remote player state
   */
  receive(state) {
    const now = performance.now();
    const playerId = state.id;

    // Check sequence number for out-of-order detection
    const lastSeq = this.sequenceNumbers.get(playerId) || 0;
    if (state.seq && state.seq <= lastSeq) {
      // Out of order or duplicate - still accept but flag
      this.stats.outOfOrder++;
    }
    if (state.seq) {
      this.sequenceNumbers.set(playerId, state.seq);
    }

    // Estimate latency from timestamp delta
    if (state.serverTime) {
      const oneWayLatency = (Date.now() - state.serverTime) / 2;
      const prevEstimate = this.latencyEstimates.get(playerId) || oneWayLatency;
      // Smooth latency estimate
      this.latencyEstimates.set(playerId, prevEstimate * 0.9 + oneWayLatency * 0.1);
    }

    // Get or create buffer for this player
    let buf = this.buffer.get(playerId);
    if (!buf) {
      buf = [];
      this.buffer.set(playerId, buf);
    }

    // Add state to buffer with receive timestamp
    buf.push({
      t: now,
      s: state
    });

    // Keep buffer bounded (last 2 seconds at 20Hz = 40 samples)
    while (buf.length > 40) {
      buf.shift();
    }

    this.stats.received++;
  }

  /**
   * Interpolate player state for smooth rendering
   * Uses a 100ms delay buffer to smooth out jitter
   */
  interpolate(id, time) {
    const buf = this.buffer.get(id);
    if (!buf || buf.length < 2) {
      // Not enough data - return latest or null
      return buf && buf.length > 0 ? buf[buf.length - 1].s : null;
    }

    // Target time is current time minus interpolation delay
    const target = time - this.interpolationDelay;

    // Find the two states to interpolate between
    let before = null;
    let after = null;

    for (let i = 0; i < buf.length - 1; i++) {
      if (buf[i].t <= target && buf[i + 1].t >= target) {
        before = buf[i];
        after = buf[i + 1];
        break;
      }
    }

    // If no bracket found, use most recent state
    if (!before || !after) {
      const latest = buf[buf.length - 1];
      // If we're too far ahead, extrapolate slightly
      if (target > latest.t && target - latest.t < 200) {
        return this._extrapolate(latest.s, target - latest.t);
      }
      return latest.s;
    }

    // Linear interpolation factor
    const t = (target - before.t) / (after.t - before.t);
    const clamped = Math.max(0, Math.min(1, t));

    return this._lerp(before.s, after.s, clamped);
  }

  /**
   * Linear interpolation between two states
   */
  _lerp(a, b, t) {
    return {
      ...b,
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
      yaw: this._lerpAngle(a.yaw || 0, b.yaw || 0, t),
      pitch: a.pitch + ((b.pitch || 0) - (a.pitch || 0)) * t
    };
  }

  /**
   * Interpolate angles correctly (handling wrap-around)
   */
  _lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  /**
   * Extrapolate state based on velocity (dead reckoning)
   */
  _extrapolate(state, deltaMs) {
    const dt = deltaMs / 1000;

    // Simple linear extrapolation using last known velocity
    const vx = state.vx || 0;
    const vy = state.vy || 0;
    const vz = state.vz || 0;

    return {
      ...state,
      x: state.x + vx * dt,
      y: state.y + vy * dt,
      z: state.z + vz * dt
    };
  }

  /**
   * Get estimated latency to a peer
   */
  getLatency(peerId) {
    return this.latencyEstimates.get(peerId) || 0;
  }

  /**
   * Get average latency across all peers
   */
  getAverageLatency() {
    if (this.latencyEstimates.size === 0) return 0;
    let sum = 0;
    for (const lat of this.latencyEstimates.values()) {
      sum += lat;
    }
    return sum / this.latencyEstimates.size;
  }

  /**
   * Get sync statistics
   */
  getStats() {
    return {
      ...this.stats,
      avgLatency: Math.round(this.getAverageLatency()),
      bufferSizes: Object.fromEntries(
        Array.from(this.buffer.entries()).map(([id, buf]) => [id, buf.length])
      )
    };
  }

  /**
   * Clear state for a disconnected player
   */
  removePlayer(id) {
    this.buffer.delete(id);
    this.latencyEstimates.delete(id);
    this.sequenceNumbers.delete(id);
  }

  /**
   * Clear all state
   */
  clear() {
    this.buffer.clear();
    this.latencyEstimates.clear();
    this.sequenceNumbers.clear();
    this.localSequence = 0;
    this.stats = { sent: 0, received: 0, dropped: 0, outOfOrder: 0 };
  }
}

GS.StateSync = StateSync;
```
