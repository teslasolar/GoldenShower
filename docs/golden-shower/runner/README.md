# Markdown Runner

The Markdown Runner parses documentation files and executes embedded code blocks, enabling game reconstruction directly from documentation.

## Overview

```javascript
// Load the runner
import { GoldenShower } from './markdown-runner.js';

// Execute a markdown file
await GoldenShower.run('engine/core.md');

// Execute multiple files in order
await GoldenShower.runAll([
  'engine/math.md',
  'engine/renderer.md',
  'multiplayer/network.md',
  'multiplayer/game.md'
]);
```

## Code Block Syntax

Code blocks in markdown are detected and executed based on language:

### JavaScript (auto-executed)

```javascript
// This code runs automatically when the doc is loaded
GoldenShower.registerModule('MyModule', {
  init() { console.log('Module initialized'); }
});
```

### With Options

Use JSON options after the language tag:

    ```javascript {"name": "player-init", "priority": 1}
    const player = new Player();
    ```

### Skip Execution

Mark blocks that shouldn't run:

    ```javascript {"noexec": true}
    // This is just an example, won't execute
    dangerousOperation();
    ```

    ```javascript {"example": true}
    // Also skipped - documentation only
    ```

## Supported Languages

| Language | Action |
|----------|--------|
| `javascript`, `js` | Execute in sandbox |
| `html` | Inject into DOM |
| `css` | Add stylesheet |
| `glsl`, `shader` | Store for WebGL |
| `json` | Parse and store |
| Others | Store only |

## Configuration

```javascript
GoldenShower.config = {
  autoExecute: true,   // Run code blocks automatically
  sandbox: true,       // Use sandboxed execution
  debug: false         // Enable debug logging
};
```

## API Reference

### GoldenShower.run(url)

Load and execute a markdown file.

```javascript
const result = await GoldenShower.run('game.md');
// result.blocks - all parsed code blocks
// result.results - execution results
```

### GoldenShower.runAll(urls)

Execute multiple files in sequence.

```javascript
await GoldenShower.runAll([
  'math.md',
  'physics.md',
  'game.md'
]);
```

### GoldenShower.parseMarkdown(content)

Parse markdown string without executing.

```javascript
const blocks = GoldenShower.parseMarkdown(markdownString);
blocks.forEach(block => {
  console.log(block.language, block.code);
});
```

### GoldenShower.parseAndExecute(markdown)

Parse and execute inline markdown.

```javascript
GoldenShower.parseAndExecute(`
# Inline Game Code

\`\`\`javascript
game.start();
\`\`\`
`);
```

### GoldenShower.registerModule(name, module)

Register a module for use in executed code.

```javascript
GoldenShower.registerModule('Physics', {
  gravity: -9.8,
  update(dt) { /* ... */ }
});
```

### GoldenShower.exportCode(language)

Get all code of a specific language concatenated.

```javascript
const allJS = GoldenShower.exportCode('javascript');
const allCSS = GoldenShower.exportCode('css');
```

## Execution Order

1. Files are loaded in the order specified
2. Within each file, blocks execute top-to-bottom
3. Use `priority` option to control order within a file

## Security

The sandbox provides:
- Limited global access
- No filesystem access
- No network access (except via GoldenShower APIs)
- Controlled console output

Disable sandbox only for trusted code:

```javascript
GoldenShower.config.sandbox = false;
```

## Integration with GitHub Pages

The runner works seamlessly on GitHub Pages:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Golden Shower</title>
  <script src="runner/markdown-runner.js"></script>
</head>
<body>
  <canvas id="game"></canvas>
  <script>
    // Load game from documentation
    GoldenShower.runAll([
      'engine/core.md',
      'multiplayer/network.md',
      'multiplayer/game.md'
    ]).then(() => {
      console.log('Game loaded from docs!');
    });
  </script>
</body>
</html>
```
