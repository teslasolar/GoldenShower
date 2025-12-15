/**
 * Golden Shower Markdown Runner
 * by Konomi Systems
 *
 * Parses markdown documentation and executes embedded code blocks
 * to reconstruct the game from documentation.
 */

(function(global) {
  'use strict';

  const GoldenShower = {
    version: '1.0.0',
    modules: {},
    executedBlocks: [],
    config: {
      autoExecute: true,
      sandbox: true,
      debug: false
    }
  };

  // Code block registry - tracks all parsed code
  const codeRegistry = {
    javascript: [],
    html: [],
    css: [],
    glsl: [],
    json: []
  };

  /**
   * Parse markdown content and extract code blocks
   */
  function parseMarkdown(content) {
    const blocks = [];
    const regex = /```(\w+)(?:\s+(\{[^}]+\}))?\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const [full, language, options, code] = match;
      blocks.push({
        language: language.toLowerCase(),
        options: options ? JSON.parse(options) : {},
        code: code.trim(),
        position: match.index
      });
    }

    return blocks;
  }

  /**
   * Execute a JavaScript code block
   */
  function executeJS(code, options = {}) {
    if (GoldenShower.config.sandbox) {
      // Create sandboxed execution context
      const sandbox = {
        GoldenShower,
        console: GoldenShower.config.debug ? console : {
          log: () => {},
          warn: () => {},
          error: console.error
        },
        Math,
        Date,
        JSON,
        Array,
        Object,
        String,
        Number,
        Boolean,
        Map,
        Set,
        Promise,
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval,
        requestAnimationFrame,
        cancelAnimationFrame,
        // Game-specific globals
        Vec3: GoldenShower.Vec3,
        Mat4: GoldenShower.Mat4,
        Player: GoldenShower.Player,
        Game: GoldenShower.Game
      };

      const fn = new Function(...Object.keys(sandbox), code);
      return fn(...Object.values(sandbox));
    } else {
      return eval(code);
    }
  }

  /**
   * Execute HTML by injecting into DOM
   */
  function executeHTML(code, options = {}) {
    const container = options.container || document.body;
    const target = options.target ? document.querySelector(options.target) : container;

    if (options.replace) {
      target.innerHTML = code;
    } else {
      target.insertAdjacentHTML('beforeend', code);
    }
  }

  /**
   * Execute CSS by injecting style tag
   */
  function executeCSS(code, options = {}) {
    const style = document.createElement('style');
    style.textContent = code;
    style.setAttribute('data-golden-shower', options.id || 'style-' + Date.now());
    document.head.appendChild(style);
  }

  /**
   * Store GLSL shader code for later use
   */
  function executeGLSL(code, options = {}) {
    const name = options.name || 'shader-' + codeRegistry.glsl.length;
    GoldenShower.shaders = GoldenShower.shaders || {};
    GoldenShower.shaders[name] = {
      type: options.type || 'fragment',
      code
    };
  }

  /**
   * Parse and store JSON configuration
   */
  function executeJSON(code, options = {}) {
    const data = JSON.parse(code);
    const name = options.name || 'config';
    GoldenShower.data = GoldenShower.data || {};
    GoldenShower.data[name] = data;
    return data;
  }

  /**
   * Execute a code block based on language
   */
  function executeBlock(block) {
    const { language, code, options } = block;

    // Skip if marked as no-execute
    if (options.noexec || options.example) {
      return null;
    }

    // Register the block
    if (codeRegistry[language]) {
      codeRegistry[language].push(block);
    }

    // Execute based on language
    switch (language) {
      case 'javascript':
      case 'js':
        return executeJS(code, options);
      case 'html':
        return executeHTML(code, options);
      case 'css':
        return executeCSS(code, options);
      case 'glsl':
      case 'shader':
        return executeGLSL(code, options);
      case 'json':
        return executeJSON(code, options);
      default:
        // Store but don't execute unknown languages
        return null;
    }
  }

  /**
   * Fetch and parse a markdown file
   */
  async function loadMarkdown(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load ${url}: ${response.status}`);
    }
    return await response.text();
  }

  /**
   * Run a markdown file - load, parse, and execute
   */
  async function run(url) {
    try {
      const content = await loadMarkdown(url);
      const blocks = parseMarkdown(content);

      if (GoldenShower.config.debug) {
        console.log(`[GoldenShower] Loaded ${url}: ${blocks.length} code blocks`);
      }

      const results = [];
      for (const block of blocks) {
        if (GoldenShower.config.autoExecute) {
          const result = executeBlock(block);
          results.push({ block, result });
          GoldenShower.executedBlocks.push(block);
        }
      }

      return { blocks, results };
    } catch (error) {
      console.error('[GoldenShower] Error:', error);
      throw error;
    }
  }

  /**
   * Run multiple markdown files in order
   */
  async function runAll(urls) {
    const results = [];
    for (const url of urls) {
      results.push(await run(url));
    }
    return results;
  }

  /**
   * Parse markdown from string (for inline use)
   */
  function parseAndExecute(markdown) {
    const blocks = parseMarkdown(markdown);
    return blocks.map(block => ({
      block,
      result: executeBlock(block)
    }));
  }

  /**
   * Register a module for use in executed code
   */
  function registerModule(name, module) {
    GoldenShower.modules[name] = module;
  }

  /**
   * Get all code blocks of a specific language
   */
  function getCodeBlocks(language) {
    return codeRegistry[language] || [];
  }

  /**
   * Export assembled code for a language
   */
  function exportCode(language) {
    const blocks = getCodeBlocks(language);
    return blocks.map(b => b.code).join('\n\n');
  }

  // Public API
  GoldenShower.run = run;
  GoldenShower.runAll = runAll;
  GoldenShower.parseMarkdown = parseMarkdown;
  GoldenShower.parseAndExecute = parseAndExecute;
  GoldenShower.executeBlock = executeBlock;
  GoldenShower.registerModule = registerModule;
  GoldenShower.getCodeBlocks = getCodeBlocks;
  GoldenShower.exportCode = exportCode;
  GoldenShower.codeRegistry = codeRegistry;

  // Expose globally
  global.GoldenShower = GoldenShower;

})(typeof window !== 'undefined' ? window : global);
