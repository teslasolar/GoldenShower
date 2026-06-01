# 🔫 GOLDEN SHOWER 🔫
## Retro Arena FPS by Konomi Systems

```
   ╔═══════════════════════════════════════════════════════════╗
   ║  ██████╗  ██████╗ ██╗     ██████╗ ███████╗███╗   ██╗     ║
   ║ ██╔════╝ ██╔═══██╗██║     ██╔══██╗██╔════╝████╗  ██║     ║
   ║ ██║  ███╗██║   ██║██║     ██║  ██║█████╗  ██╔██╗ ██║     ║
   ║ ██║   ██║██║   ██║██║     ██║  ██║██╔══╝  ██║╚██╗██║     ║
   ║ ╚██████╔╝╚██████╔╝███████╗██████╔╝███████╗██║ ╚████║     ║
   ║  ╚═════╝  ╚═════╝ ╚══════╝╚═════╝ ╚══════╝╚═╝  ╚═══╝     ║
   ║           S H O W E R   //   K O N O M I                 ║
   ╚═══════════════════════════════════════════════════════════╝
```

[![CI](https://github.com/teslasolar/goldenshower/actions/workflows/ci.yml/badge.svg)](https://github.com/teslasolar/goldenshower/actions)
[![Issues](https://img.shields.io/github/issues/teslasolar/goldenshower?label=tags&color=gold)](https://github.com/teslasolar/goldenshower/issues)
[![Pages](https://img.shields.io/badge/play-GitHub%20Pages-brightgreen)](https://teslasolar.github.io/goldenshower)

## 📊 Live Stats (from GitHub Issues Tag DB)

<!-- STATS:START - auto-updated by CI -->
| Metric | Value |
|--------|-------|
| 🎮 Characters | 8 |
| 🔫 Weapons | 7 |
| 🗺️ Maps | 6 |
| 🌐 Protocol | KQTT P2P |
| 📡 Servers | 0 (serverless) |
<!-- STATS:END -->

> **Tag DB**: Every [GitHub Issue](https://github.com/teslasolar/goldenshower/issues) with label `tag` is a live database entry. Add weapons, maps, characters, and mods by opening issues. CI reads them.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GOLDEN SHOWER STACK                      │
├─────────────────────────────────────────────────────────────┤
│  📄 MarkdownRunner    │ Parse docs → Execute code           │
│  ⚡ Engine            │ WebGL + Math + Input + Loop         │
│  🌐 KQTT Network     │ WebRTC P2P + StateSync              │
│  📦 Lobby             │ Host/Join + Settings + Ready        │
│  🔫 Game              │ Players + Weapons + Arena           │
│  🎵 Audio Fabric      │ Konomi audio-reactive integration   │
└─────────────────────────────────────────────────────────────┘

     GitHub Pages VM ◄──── WebRTC P2P ────► GitHub Pages VM
```

## 🎮 Characters

| Character | Color | Trait | Hitbox |
|-----------|-------|-------|--------|
| **Auric** | Gold | Balanced all-rounder | Standard |
| **Janus** | Silver | Mirror double | Standard |
| **Cipher** | Cyan | Hacker, speed | Standard |
| **Colossus** | Chrome | Tank, slow, high HP | Large |
| **Imp** | Black | Fast, short | Small |
| **Viper** | Red | Aggressive, close-range | Standard |
| **Mayday** | Purple | Heavy hitter | Standard |
| **Samedi** | White | Voodoo, survives death once | Standard |

## 🔫 Weapons

| Weapon | Damage | Rate | Type |
|--------|--------|------|------|
| **Unarmed** | 10 | Melee | Fists |
| **Sidearm** | 25 | Semi | Pistol |
| **Carbine** | 15 | Auto | Rifle |
| **Shotgun** | 80 | Pump | Spread |
| **Marksman** | 80 | Bolt | Scoped |
| **Launcher** | 150 | Slow | Splash |
| **Gilded** | 1000 | Single | One-shot-kill |

## 🗺️ Maps

| Map | Theme | Size |
|-----|-------|------|
| **Refinery** | Industrial corridors | Medium |
| **Shrine** | Stone pillars, open | Large |
| **Tower** | Vertical multi-level | Small |
| **Labyrinth** | Tight corridors | Medium |
| **Archive** | Multi-floor, railings | Large |
| **Vault** | Underground, concrete | Medium |

## 🚀 Play

### Browser (GitHub Pages)
```
https://teslasolar.github.io/goldenshower
```

### Local
```bash
git clone https://github.com/teslasolar/goldenshower.git
cd goldenshower
npx serve .
# → open localhost:3000
```

### Steam (coming)
Packaged with Electron. Same codebase, same P2P.

## 🌐 KQTT Protocol

Zero servers. Players connect directly via WebRTC.
- **Discovery**: WebTorrent DHT for game listing
- **Signaling**: GitHub Issues or manual share
- **Transport**: WebRTC DataChannels
- **Sync**: State sync at 20Hz, client-side prediction

## 📦 Tag DB (GitHub Issues)

Open a GitHub Issue with label `tag` to add content:
```
Title: weapon:plasma-rifle
Body:
  dmg: 40
  rate: auto
  range: 800
  type: energy
```
CI reads these and generates game data dynamically.

## 📄 Markdown Runner

The entire game is defined in markdown docs. `markdown-runner.js` parses `.md` files, extracts fenced code blocks, and executes them in order. Change the docs, change the game.

---

**Konomi Systems** · GOLDEN SHOWER · No servers, no rules, no pants.
