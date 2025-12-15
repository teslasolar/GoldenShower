/**
 * Golden Shower Markdown Runner
 * Parses and executes code from markdown docs
 * by Konomi Systems
 */
class MarkdownRunner {
  constructor() {
    this.modules = new Map();
    this.loaded = [];
  }

  async loadDoc(path) {
    const res = await fetch(path);
    const md = await res.text();
    return this.parse(md);
  }

  parse(md) {
    const blocks = [];
    const regex = /```(\w+)\n([\s\S]*?)```/g;
    let m;
    while ((m = regex.exec(md)) !== null) {
      blocks.push({ lang: m[1], code: m[2] });
    }
    return blocks;
  }

  exec(blocks, ctx = window) {
    blocks.filter(b => b.lang === 'javascript')
      .forEach(b => {
        try {
          new Function(b.code).call(ctx);
        } catch (e) {
          console.error('[Runner] Error:', e);
        }
      });
  }

  async loadModule(name, path) {
    const blocks = await this.loadDoc(path);
    this.modules.set(name, blocks);
    this.loaded.push(name);
    return blocks;
  }

  async loadAll(manifest) {
    for (const [name, path] of Object.entries(manifest)) {
      await this.loadModule(name, path);
    }
  }

  execAll() {
    for (const name of this.loaded) {
      this.exec(this.modules.get(name));
    }
  }
}

// Export for both browser and Node
if (typeof module !== 'undefined') module.exports = MarkdownRunner;
if (typeof window !== 'undefined') window.MarkdownRunner = MarkdownRunner;
