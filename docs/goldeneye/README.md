# GoldenEye 007 N64 - Technical Documentation

Concise reconstruction reference for GoldenEye 007 (1997).

## Files

| File | Content |
|------|---------|
| [specs.md](specs.md) | Hardware specs, game size, constraints |
| [history.md](history.md) | Dev timeline, team, influences |
| [systems.md](systems.md) | Engine overview, STAN, tools |
| [code-patterns.md](code-patterns.md) | Core code structures + modern equivalents |
| [rendering.md](rendering.md) | GBI, display lists, textures, culling |
| [ai-deep.md](ai-deep.md) | Action blocks, FSM, perception, pathfinding |
| [weapons.md](weapons.md) | Weapon data, damage, hitboxes |
| [audio.md](audio.md) | 3D sound, music, AI hearing |
| [multiplayer.md](multiplayer.md) | Split-screen, modes, spawns |
| [level-format.md](level-format.md) | Setup files, object types, PADs |

## Quick Reference

```
Game:     12 MB cartridge, <10 devs, 2.5yr, $2M budget
N64:      93.75MHz CPU, 62.5MHz RCP, 4MB RAM, 4KB TMEM
Engine:   Custom C, ~1500 tris @ 30fps
AI:       Action block bytecode VM + PAD nav graph
Render:   Room-based culling, grayscale texture trick
```

## Decompilation

- Source: [gitlab.com/kholdfuzion/goldeneye_src](https://gitlab.com/kholdfuzion/goldeneye_src)
- Mirror: [github.com/n64decomp/007](https://github.com/n64decomp/007)
- Editor: [github.com/carnivoroussociety/GoldEditor](https://github.com/carnivoroussociety/GoldEditor)

## Modern Stack

| System | Library |
|--------|---------|
| Render | bgfx / sokol / wgpu |
| Physics | Jolt / Bullet |
| AI Nav | Recast / Detour |
| AI Logic | BehaviorTree.CPP |
| Audio | miniaudio / FMOD |
| Math | glm / cglm |
