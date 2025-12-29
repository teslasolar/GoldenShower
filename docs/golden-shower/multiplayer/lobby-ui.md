# Lobby UI

Renders lobby state with P2P connection options and handles user interactions.

```javascript
/**
 * LobbyUI - Lobby interface with P2P connection management
 */
class LobbyUI {
  constructor(el) {
    this.el = el;
    this.lobby = null;
    this.showP2PPanel = false;
    this.p2pOffer = null;
    this.p2pStatus = '';
  }

  bind(lobby) {
    this.lobby = lobby;
    lobby.on('update', () => this.render());
    lobby.on('game-launch', () => { this.el.style.display = 'none'; });
    lobby.on('peer-connected', () => {
      this.p2pStatus = 'Peer connected!';
      this.render();
    });
  }

  render() {
    const L = this.lobby;
    if (!L) return;

    const chars = GS.Characters || [];
    const players = Array.from(L.players.values());
    const localPlayer = players.find(p => p.id === L.localId);
    const allReady = players.length > 0 && players.every(p => p.ready);
    const stats = L.getNetworkStats();

    this.el.innerHTML = `
      <div class="lobby-panel">
        <h2>LOBBY: ${L.code}</h2>

        <!-- Connection Status -->
        <div style="background:#1a1a2a;padding:10px;margin-bottom:15px;border-left:3px solid ${stats?.peers > 0 ? '#0f0' : '#ff0'}">
          <span style="color:#888;font-size:12px">CONNECTION:</span>
          <span style="color:#fff;margin-left:8px">${stats?.peers > 0 ? `${stats.peers} peer(s) connected` : 'Local only'}</span>
          <button id="p2pBtn" class="btn btn-secondary" style="float:right;padding:4px 10px;font-size:11px">
            ${this.showP2PPanel ? 'Hide P2P' : 'Connect P2P'}
          </button>
        </div>

        <!-- P2P Connection Panel -->
        ${this.showP2PPanel ? this._renderP2PPanel() : ''}

        <!-- Players List -->
        <div class="players-list">
          <h3>PLAYERS (${players.length}/${L.settings.max})</h3>
          ${players.map(p => `
            <div class="player-row ${p.ready ? 'ready' : ''}">
              <span class="player-name">${p.name}${p.id === L.localId ? ' (You)' : ''}</span>
              <span class="player-char">${chars[p.character]?.name || '?'}</span>
              <span class="player-status">${p.ready ? 'READY' : 'NOT READY'}</span>
            </div>
          `).join('')}
        </div>

        <!-- Name Input -->
        <div style="margin:15px 0">
          <h3>YOUR NAME</h3>
          <input type="text" id="nameInput" class="form-input" value="${localPlayer?.name || 'Player'}" style="width:200px">
        </div>

        <!-- Character Select -->
        <div class="character-select">
          <h3>CHARACTER</h3>
          <div class="characters">
            ${chars.map((c, i) => `
              <button class="char-btn ${localPlayer?.character === i ? 'selected' : ''}" data-c="${i}"
                style="${localPlayer?.character === i ? 'border-color:#d4af37;color:#fff' : ''}">
                ${c.name}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Actions -->
        <div class="actions">
          <button id="readyBtn" class="btn btn-ready">${localPlayer?.ready ? 'UNREADY' : 'READY'}</button>
          ${L.isHost ? `<button id="startBtn" class="btn btn-start" ${allReady ? '' : 'disabled'}>START</button>` : ''}
          <button id="leaveBtn" class="btn btn-leave">LEAVE</button>
        </div>

        <!-- Stats -->
        ${stats ? `
          <div style="margin-top:20px;padding-top:10px;border-top:1px solid #333;font-size:11px;color:#666">
            Peer ID: ${stats.peerId} | Sent: ${stats.sent} | Recv: ${stats.received}
          </div>
        ` : ''}
      </div>
    `;

    this._bind();
  }

  _renderP2PPanel() {
    return `
      <div style="background:#0a0a15;padding:15px;margin-bottom:15px;border:1px solid #333">
        <h3 style="color:#d4af37;margin-bottom:10px">P2P CONNECTION</h3>

        ${this.p2pStatus ? `<div style="color:#0f0;margin-bottom:10px">${this.p2pStatus}</div>` : ''}

        <!-- Host creates offer -->
        <div style="margin-bottom:15px">
          <button id="createOfferBtn" class="btn btn-secondary" style="width:100%">
            1. Create Connection Offer
          </button>
          ${this.p2pOffer ? `
            <div style="margin-top:8px">
              <textarea id="offerText" readonly style="width:100%;height:60px;background:#111;color:#0f0;border:1px solid #333;font-family:monospace;font-size:10px">${this.p2pOffer}</textarea>
              <button id="copyOfferBtn" class="btn btn-sm" style="margin-top:5px">Copy Offer</button>
            </div>
          ` : ''}
        </div>

        <!-- Divider -->
        <div style="text-align:center;color:#555;margin:15px 0">- OR -</div>

        <!-- Join with offer -->
        <div style="margin-bottom:15px">
          <label style="color:#888;font-size:11px">Paste Offer from Host:</label>
          <textarea id="pasteOfferInput" style="width:100%;height:50px;background:#111;color:#fff;border:1px solid #333;font-family:monospace;font-size:10px" placeholder="Paste offer here..."></textarea>
          <button id="acceptOfferBtn" class="btn btn-secondary" style="width:100%;margin-top:5px">
            2. Accept Offer (Get Answer)
          </button>
        </div>

        <!-- Host accepts answer -->
        <div>
          <label style="color:#888;font-size:11px">Paste Answer from Joiner:</label>
          <textarea id="pasteAnswerInput" style="width:100%;height:50px;background:#111;color:#fff;border:1px solid #333;font-family:monospace;font-size:10px" placeholder="Paste answer here..."></textarea>
          <button id="acceptAnswerBtn" class="btn" style="width:100%;margin-top:5px">
            3. Complete Connection
          </button>
        </div>

        <div style="margin-top:15px;color:#666;font-size:10px">
          <strong>How to connect:</strong><br>
          1. Host clicks "Create Offer" and copies the text<br>
          2. Joiner pastes offer and clicks "Accept Offer"<br>
          3. Joiner copies the answer and sends to host<br>
          4. Host pastes answer and clicks "Complete Connection"
        </div>
      </div>
    `;
  }

  _bind() {
    const L = this.lobby;

    // Toggle P2P panel
    document.getElementById('p2pBtn')?.addEventListener('click', () => {
      this.showP2PPanel = !this.showP2PPanel;
      this.render();
    });

    // Create offer
    document.getElementById('createOfferBtn')?.addEventListener('click', async () => {
      try {
        this.p2pStatus = 'Creating offer...';
        this.render();
        const result = await L.createP2POffer();
        this.p2pOffer = result.offer;
        this.p2pStatus = 'Offer created! Copy and share with peer.';
        this.render();
      } catch (e) {
        this.p2pStatus = 'Error: ' + e.message;
        this.render();
      }
    });

    // Copy offer
    document.getElementById('copyOfferBtn')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(this.p2pOffer);
        this.p2pStatus = 'Offer copied to clipboard!';
        this.render();
      } catch (e) {
        this.p2pStatus = 'Copy failed - select and copy manually';
        this.render();
      }
    });

    // Accept offer
    document.getElementById('acceptOfferBtn')?.addEventListener('click', async () => {
      const offerText = document.getElementById('pasteOfferInput')?.value;
      if (!offerText) {
        this.p2pStatus = 'Please paste an offer first';
        this.render();
        return;
      }
      try {
        this.p2pStatus = 'Processing offer...';
        this.render();
        const result = await L.acceptP2POffer(offerText);
        this.p2pOffer = result.answer;
        this.p2pStatus = 'Answer created! Copy and send to host.';
        try {
          await navigator.clipboard.writeText(result.answer);
          this.p2pStatus += ' (Copied!)';
        } catch {}
        this.render();
      } catch (e) {
        this.p2pStatus = 'Error: ' + e.message;
        this.render();
      }
    });

    // Accept answer
    document.getElementById('acceptAnswerBtn')?.addEventListener('click', async () => {
      const answerText = document.getElementById('pasteAnswerInput')?.value;
      if (!answerText) {
        this.p2pStatus = 'Please paste an answer first';
        this.render();
        return;
      }
      try {
        this.p2pStatus = 'Connecting...';
        this.render();
        await L.acceptP2PAnswer(answerText);
        this.p2pStatus = 'Connected! Peer joined the lobby.';
        this.showP2PPanel = false;
        this.render();
      } catch (e) {
        this.p2pStatus = 'Error: ' + e.message;
        this.render();
      }
    });

    // Ready button
    document.getElementById('readyBtn')?.addEventListener('click', () => {
      const players = Array.from(L.players.values());
      const p = players.find(x => x.id === L.localId);
      L.setReady(!p?.ready);
    });

    // Start button
    document.getElementById('startBtn')?.addEventListener('click', () => L.start());

    // Leave button
    document.getElementById('leaveBtn')?.addEventListener('click', () => {
      L.leave();
      location.reload();
    });

    // Character selection
    document.querySelectorAll('.char-btn').forEach(b =>
      b.addEventListener('click', () => L.setChar(parseInt(b.dataset.c)))
    );

    // Name input
    document.getElementById('nameInput')?.addEventListener('change', (e) => {
      L.setName(e.target.value);
    });
  }
}

GS.LobbyUI = LobbyUI;
```
