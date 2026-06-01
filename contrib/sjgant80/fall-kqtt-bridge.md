# fall-kqtt-bridge

Bridges Simon's `fall-signal` mesh (BroadcastChannel) ↔ Thomas's `GS.KQTT` (WebRTC P2P pub/sub).

**Effect**: any of the 89 estate tools subscribed to `fall-signal` automatically hear GoldenShower game events, and vice versa. The substrate joins the arena. Konomi audit chain can sign every match without the game knowing.

**By**: Simon Gant · sjgant80 · prime 401 · ◊·κ=φ⁴

---

## Architecture

```
┌──────────────────────────────┐         ┌─────────────────────────────┐
│  AI NATIVE ESTATE            │         │  GOLDEN SHOWER              │
│                              │         │                             │
│  ╭─ fall-signal ─────────╮   │         │   ╭─ GS.KQTT ──────────╮    │
│  │ BroadcastChannel      │   │         │   │ WebRTC mesh        │    │
│  │ kind: substrate_*,    │◄──┼─────────┼──►│ topic: gs/<code>/# │    │
│  │       konomi_minted,  │   │ BRIDGE  │   │                    │    │
│  │       linkedin_*, ... │   │         │   ╰────────────────────╯    │
│  ╰───────────────────────╯   │         │                             │
│                              │         │                             │
│  89 sovereign tools          │         │   Players · weapons         │
│  cockpit · konomi-mint       │         │   chat · scoreboard         │
└──────────────────────────────┘         └─────────────────────────────┘
```

**Naming convention** (the contract):
- Estate event → `gs/<code>/fall/<source>/<kind>` (e.g. `gs/ABC123/fall/si-didy/konomi_minted`)
- Game event → `fall-signal` payload `{ source: 'goldenshower', kind: <gs-topic-leaf>, payload: <gs-msg>, gs_code: <code> }`

The `fall/` namespace under `gs/<code>/` keeps the estate mesh isolated from game traffic — players don't see your audit chain unless they subscribe to `gs/<code>/fall/#` explicitly.

---

## The bridge module (drop-in, 50 LOC)

```javascript
/**
 * fall-kqtt-bridge · v1.0
 * Bridges BroadcastChannel('fall-signal') ↔ GS.KQTT
 * by Simon Gant · sjgant80 · prime 401 · ◊·κ=φ⁴
 *
 * Usage: after `network.init(code)` in your Lobby,
 *   GS.FallKQTTBridge.attach(network.kqtt, code);
 */
class FallKQTTBridge {
  constructor(kqtt, code, opts = {}) {
    this.kqtt = kqtt;
    this.code = code;
    this.relayEstateToGame = opts.relayEstateToGame !== false; // default ON
    this.relayGameToEstate = opts.relayGameToEstate !== false; // default ON
    this.topicPrefix = `gs/${code}/fall`;
    this.bc = new BroadcastChannel('fall-signal');
    this.stats = { estate_to_game: 0, game_to_estate: 0, started_at: Date.now() };

    // Estate → game: republish fall-signal events under gs/<code>/fall/<source>/<kind>
    if (this.relayEstateToGame) {
      this.bc.onmessage = (e) => {
        try {
          const ev = e.data;
          if (!ev || ev.source === 'goldenshower') return; // don't echo our own
          const src = (ev.source || 'unknown').replace(/[^a-z0-9_-]/gi, '_');
          const kind = (ev.kind || ev.type || 'event').replace(/[^a-z0-9_-]/gi, '_');
          const topic = `${this.topicPrefix}/${src}/${kind}`;
          this.kqtt.publish(topic, {
            source: ev.source,
            kind: ev.kind || ev.type,
            payload: ev.payload || ev,
            ts: ev.ts || new Date().toISOString(),
            bridge: 'fall-kqtt-bridge/1.0',
          });
          this.stats.estate_to_game++;
        } catch (err) { console.warn('[fall-kqtt-bridge] estate→game err', err); }
      };
    }

    // Game → estate: subscribe to gs/<code>/fall/# and republish on fall-signal
    if (this.relayGameToEstate) {
      this.kqtt.subscribe(`${this.topicPrefix}/#`, (msg) => {
        try {
          const leaf = (msg.topic || '').split('/').slice(3).join('/');
          this.bc.postMessage({
            type: 'fall_signal',
            source: 'goldenshower',
            kind: leaf || 'event',
            payload: msg.payload || msg,
            gs_code: this.code,
            ts: new Date().toISOString(),
          });
          this.stats.game_to_estate++;
        } catch (err) { console.warn('[fall-kqtt-bridge] game→estate err', err); }
      });
    }

    console.log(`[fall-kqtt-bridge] attached · code=${code} · prefix=${this.topicPrefix}`);
  }

  detach() {
    try { this.bc.close(); } catch (_) {}
    // KQTT unsubscribe (best-effort; framework-dependent)
    console.log('[fall-kqtt-bridge] detached');
  }

  static attach(kqtt, code, opts) {
    return new FallKQTTBridge(kqtt, code, opts);
  }
}

if (typeof GS !== 'undefined') GS.FallKQTTBridge = FallKQTTBridge;
if (typeof window !== 'undefined') window.FallKQTTBridge = FallKQTTBridge;
if (typeof module !== 'undefined') module.exports = FallKQTTBridge;
```

---

## What this immediately unlocks

| Estate tool | Subscribes to | New capability |
|-------------|---------------|---------------|
| `konomi_mint` (si-didy) | `gs/<code>/fall/goldenshower/match_complete` | Every match result auto-mints a signed cert |
| `fall-verify` | `gs/<code>/fall/goldenshower/leaderboard` | Top scores get adversarially-verified for cheats |
| `fall-vetter` | `gs/<code>/fall/goldenshower/lobby_join` | Player handle gets vetted before they touch the arena |
| `cassie-anthropic` | `gs/<code>/fall/goldenshower/replay_frame` | Replay analysis · bloom-vector the match |
| AIN hub | `gs/<code>/fall/goldenshower/match_complete` | Estate-wide leaderboard surfaced in the marketplace |
| All 89 tools | `fall-signal` (already do) | Now they also hear arena state · zero per-tool wiring |

---

## How to use (paste into your Lobby init)

In `docs/golden-shower/multiplayer/lobby.md` after `network.init(code)`:

```javascript
// ◊ optional · join the AI Native Solutions mesh
if (typeof GS.FallKQTTBridge !== 'undefined') {
  GS.fallBridge = GS.FallKQTTBridge.attach(network.kqtt, code);
}
```

That's it. Single line. If the bridge module isn't loaded, the game continues normally.

---

## Konomi Standard compliance

- **Namespace**: `gs/<code>/fall/...` — isolated under the GoldenShower topic tree
- **Source-tagged**: every estate event carries its origin tool name
- **Audit-friendly**: every relayed event is timestamped + bridge-versioned
- **Zero dependency**: BroadcastChannel + the existing KQTT instance · no new transport
- **Opt-in**: relayEstateToGame and relayGameToEstate are independent toggles
- **Loop-safe**: filters its own goldenshower-sourced echoes

---

## Mint candidate

This bridge spec is itself an authored artefact. Once merged it should be minted via Simon's `konomi_mint`:

```
artefact_path: docs/golden-shower/contrib/sjgant80/fall-kqtt-bridge.md
parents: ['<v20.1-seed-cert-id>', '<substrate-doc-cert-id>']
note: "first cross-builder Konomi composition · teslasolar/GoldenShower × ai-nativesolutions"
```

◊·κ=φ⁴ · prime 401 · the substrate joins the arena
