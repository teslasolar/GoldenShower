# KQTT Torrent

Open P2P via WebTorrent DHT.

```javascript
/**
 * @udt KQTTTorrent
 * WebTorrent transport for open discovery
 */
class KQTTTorrent {
  constructor(kqtt) {
    this.kqtt = kqtt;
    this.client = null;
    this.torrent = null;
    this.wires = new Map();
    this.roomCode = null;
    this.ready = false;
  }

  static isAvailable() { return typeof WebTorrent !== 'undefined'; }

  async join(roomCode) {
    if (!KQTTTorrent.isAvailable()) throw new Error('WebTorrent not loaded');
    this.roomCode = roomCode;
    this.client = new WebTorrent();
    const data = new TextEncoder().encode(`KQTT-ROOM:${roomCode}:${Date.now().toString(36)}`);
    const blob = new Blob([data], { type: 'application/octet-stream' });
    return new Promise((resolve, reject) => {
      this.client.seed(blob, { name: `kqtt-${roomCode}`, announce: ['wss://tracker.openwebtorrent.com', 'wss://tracker.btorrent.xyz'] }, (torrent) => {
        this.torrent = torrent;
        this.ready = true;
        torrent.on('wire', (wire) => this._handleWire(wire));
        resolve({ roomCode, magnetURI: torrent.magnetURI, infoHash: torrent.infoHash });
      });
      this.client.on('error', reject);
    });
  }

  async connect(magnetOrCode) {
    if (!KQTTTorrent.isAvailable()) throw new Error('WebTorrent not loaded');
    this.client = new WebTorrent();
    return new Promise((resolve, reject) => {
      this.client.add(magnetOrCode, { announce: ['wss://tracker.openwebtorrent.com', 'wss://tracker.btorrent.xyz'] }, (torrent) => {
        this.torrent = torrent;
        this.ready = true;
        this.roomCode = torrent.name.replace('kqtt-', '');
        torrent.on('wire', (wire) => this._handleWire(wire));
        torrent.wires.forEach(wire => this._handleWire(wire));
        resolve({ roomCode: this.roomCode, peers: torrent.numPeers });
      });
      this.client.on('error', reject);
    });
  }

  _handleWire(wire) {
    const peerId = wire.peerId?.toString('hex')?.substr(0, 8) || this.kqtt._genId();
    wire.on('close', () => { this.wires.delete(peerId); this.kqtt.emit('peer-leave', { peerId, transport: 'torrent' }); });
    this.wires.set(peerId, wire);
    this.kqtt.emit('peer-join', { peerId, transport: 'torrent' });
  }

  broadcast(msg) {
    if (!this.ready) return 0;
    const data = JSON.stringify(msg);
    let sent = 0;
    for (const [, wire] of this.wires) {
      try { if (wire.extended) { wire.extended('kqtt', Buffer.from(data)); sent++; } } catch {}
    }
    return sent;
  }

  getStats() { return this.torrent ? { roomCode: this.roomCode, peers: this.torrent.numPeers } : null; }
  close() { this.torrent?.destroy(); this.client?.destroy(); this.wires.clear(); this.ready = false; }
}

GS.KQTTTorrent = KQTTTorrent;
```
