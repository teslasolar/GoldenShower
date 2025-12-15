# Golden Shower

**GoldenEye Multiplayer Reconstruction**
*by Konomi Systems*

A web-based multiplayer reconstruction of GoldenEye 007's legendary multiplayer mode, designed to run across distributed GitHub Pages VM clients.

## Project Goals

1. **Multiplayer First** - Focus on the 4-player deathmatch experience
2. **Web Native** - Runs entirely in browser via WebGL/Canvas
3. **Distributed** - Connect players across GitHub Pages instances via WebRTC
4. **Documentation-Driven** - All code can be parsed and executed from markdown docs

## Architecture

```
golden-shower/
├── runner/          # Markdown runner - parse & execute docs
├── multiplayer/     # WebRTC networking, state sync
├── engine/          # Game engine (rendering, physics, input)
└── README.md        # This file
```

## Quick Start

```html
<!-- Include the runner in any HTML page -->
<script src="runner/markdown-runner.js"></script>
<script>
  // Load and execute game from docs
  GoldenShower.run('multiplayer/game.md');
</script>
```

## Multiplayer Connection

Players connect via WebRTC peer-to-peer:

```javascript
// Join a game lobby
const lobby = await GoldenShower.connect('lobby-code');
lobby.on('player-joined', (player) => console.log(`${player.name} joined`));
lobby.on('game-start', () => game.start());
```

## Documentation

| Document | Description |
|----------|-------------|
| [runner/](runner/) | Markdown parser and code executor |
| [multiplayer/](multiplayer/) | Networking and state synchronization |
| [engine/](engine/) | Game rendering and logic |

## Credits

- Original GoldenEye 007 by Rare (1997)
- Reconstruction by Konomi Systems
- Based on decompilation research by the community

## License

Educational reconstruction project. All trademarks belong to their respective owners.
